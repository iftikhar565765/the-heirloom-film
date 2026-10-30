<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'Only RSVP submissions are accepted.']);
}

$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($contentType !== 'application/json') {
    respond(415, ['error' => 'Submit the RSVP using the invitation form.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 16384) {
    respond(413, ['error' => 'The RSVP is too large to process.']);
}

$id = (string) ($_GET['id'] ?? '');
if (preg_match('/^[a-f0-9]{24}$/', $id) !== 1) {
    respond(400, ['error' => 'The invitation link is invalid.']);
}

$configuredDataDirectory = getenv('HEIRLOOM_DATA_DIR');
$dataDirectory = $configuredDataDirectory !== false && $configuredDataDirectory !== ''
    ? $configuredDataDirectory
    : rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR .
        'heirloom-invitations-' . substr(hash('sha256', __DIR__), 0, 16);
$recordPath = $dataDirectory . DIRECTORY_SEPARATOR . $id . '.json';
if (!is_file($recordPath)) {
    respond(404, ['error' => 'This invitation was not found.']);
}
$recordFile = fopen($recordPath, 'rb');
$recordJson = false;
if ($recordFile !== false) {
    if (flock($recordFile, LOCK_SH)) {
        $recordJson = stream_get_contents($recordFile);
        flock($recordFile, LOCK_UN);
    }
    fclose($recordFile);
}
$record = is_string($recordJson) ? json_decode($recordJson, true) : null;
if (!is_array($record) || empty($record['published'])) {
    respond(404, ['error' => 'This invitation is not available for replies.']);
}

$recipient = filter_var($record['recipient'] ?? '', FILTER_VALIDATE_EMAIL);
$maxGuests = filter_var($record['max_guests'] ?? 2, FILTER_VALIDATE_INT);
if (!$recipient) {
    error_log('Published RSVP recipient is invalid.');
    respond(503, ['error' => 'RSVP email delivery is not configured correctly.']);
}
if ($maxGuests === false || $maxGuests < 1 || $maxGuests > 20) {
    error_log('RSVP guest limit is invalid.');
    respond(503, ['error' => 'RSVP guest limit is not configured correctly.']);
}

$rawBody = file_get_contents('php://input');
$reply = json_decode($rawBody === false ? '' : $rawBody, true);
if (!is_array($reply)) {
    respond(400, ['error' => 'The RSVP could not be read. Please try again.']);
}

if (!empty($reply['website'])) {
    respond(400, ['error' => 'The RSVP could not be accepted.']);
}

if (session_status() !== PHP_SESSION_ACTIVE && !session_start()) {
    error_log('Could not start RSVP rate-limit session.');
    respond(503, ['error' => 'RSVP delivery is temporarily unavailable.']);
}

$now = time();
$attempts = $_SESSION['rsvp_attempts'] ?? [];
$attempts = array_values(array_filter(
    is_array($attempts) ? $attempts : [],
    static fn ($timestamp): bool => is_int($timestamp) && $timestamp > $now - 600
));
if (count($attempts) >= 5) {
    respond(429, ['error' => 'Too many replies were sent from this browser. Please try again later.']);
}
$_SESSION['rsvp_attempts'] = $attempts;

$nameValue = $reply['name'] ?? null;
$emailValue = $reply['email'] ?? null;
$attendanceValue = $reply['attendance'] ?? null;
$guestsValue = $reply['guests'] ?? null;
if (!is_string($nameValue) || !is_string($emailValue) ||
    !is_string($attendanceValue) || (!is_int($guestsValue) && !is_string($guestsValue))) {
    respond(422, ['error' => 'Please check the name, email, attendance and guest count.']);
}

$name = trim(strip_tags($nameValue));
$email = trim($emailValue);
$attendance = $attendanceValue;
$guests = filter_var($guestsValue, FILTER_VALIDATE_INT);

if (strlen($name) < 2 || strlen($name) > 240 ||
    !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 ||
    !in_array($attendance, ['attending', 'declining'], true) ||
    $guests === false || $guests < 1 || $guests > $maxGuests) {
    respond(422, ['error' => 'Please check the name, email, attendance and guest count.']);
}

$cleanText = static function ($value, int $maxLength): string {
    if (!is_string($value)) {
        return '';
    }
    $text = trim(strip_tags($value));
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text) ?? '';
    if (function_exists('mb_substr')) {
        return mb_substr($text, 0, $maxLength, 'UTF-8');
    }
    return substr($text, 0, $maxLength);
};

$name = preg_replace('/[\r\n]+/', ' ', $name) ?? '';
$dietary = $cleanText($reply['dietary'] ?? '', 1000);
$message = $cleanText($reply['message'] ?? '', 2000);
$attendanceLabel = $attendance === 'attending' ? 'Attending' : 'Declining';
$body = implode("\n", [
    'A wedding RSVP was submitted.',
    '',
    'Name: ' . $name,
    'Email: ' . $email,
    'Attendance: ' . $attendanceLabel,
    'Party size: ' . $guests,
    'Dietary requirements: ' . ($dietary !== '' ? $dietary : 'None provided'),
    'Message: ' . ($message !== '' ? $message : 'None provided'),
]);

$headers = [
    'From: Wedding RSVP <' . $recipient . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
];

$_SESSION['rsvp_attempts'][] = $now;
if (!function_exists('mail')) {
    error_log('PHP mail() is unavailable for RSVP delivery.');
    respond(503, ['error' => 'Email delivery is not available on this host.']);
}
if (!@mail($recipient, 'Wedding invitation RSVP', $body, implode("\r\n", $headers))) {
    error_log('PHP mail() could not hand off an RSVP.');
    respond(502, ['error' => 'The RSVP could not be delivered. Please try again or contact the couple.']);
}

respond(200, ['ok' => true]);
