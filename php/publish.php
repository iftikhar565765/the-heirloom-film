<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

const MAX_CONFIG_BYTES = 16 * 1024 * 1024;

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES);
    exit;
}

function dataDirectory(): string
{
    $configured = getenv('HEIRLOOM_DATA_DIR');
    $directory = $configured !== false && $configured !== ''
        ? $configured
        : rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR .
            'heirloom-invitations-' . substr(hash('sha256', __DIR__), 0, 16);
    if (!is_dir($directory) && !mkdir($directory, 0700, true) && !is_dir($directory)) {
        respond(500, ['error' => 'Publishing storage could not be prepared.']);
    }

    return $directory;
}

function validId(string $id): bool
{
    return preg_match('/^[a-f0-9]{24}$/', $id) === 1;
}

function loadRecord(string $id): ?array
{
    $path = dataDirectory() . '/' . $id . '.json';
    if (!is_file($path)) {
        return null;
    }

    $file = fopen($path, 'rb');
    if ($file === false) {
        return null;
    }
    try {
        if (!flock($file, LOCK_SH)) {
            return null;
        }
        $contents = stream_get_contents($file);
        $record = is_string($contents) ? json_decode($contents, true) : null;
        return is_array($record) ? $record : null;
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}

function storeRecord(array $record, bool $create = false): bool
{
    $path = dataDirectory() . '/' . $record['id'] . '.json';
    $mode = $create ? 'x+b' : 'c+b';
    $file = fopen($path, $mode);
    if ($file === false) {
        return false;
    }

    try {
        if (!flock($file, LOCK_EX)) {
            return false;
        }

        if (!$create) {
            rewind($file);
            $existing = json_decode((string) stream_get_contents($file), true);
            if (!is_array($existing) ||
                !hash_equals((string) ($existing['owner_hash'] ?? ''), (string) $record['owner_hash'])) {
                return false;
            }
        }

        $json = json_encode($record, JSON_UNESCAPED_SLASHES);
        if (!is_string($json)) {
            return false;
        }

        rewind($file);
        if (!ftruncate($file, 0) || fwrite($file, $json) !== strlen($json)) {
            return false;
        }
        fflush($file);
        chmod($path, 0600);
        return true;
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}

function publicConfig(array $record): array
{
    $config = $record['config'];
    $config['rsvp'] = is_array($config['rsvp'] ?? null) ? $config['rsvp'] : [];
    $config['rsvp']['endpoint'] = 'php/rsvp.php?id=' . rawurlencode($record['id']);
    return $config;
}

function managementRecord(string $id, array $record): void
{
    $token = (string) ($_SERVER['HTTP_X_INVITATION_TOKEN'] ?? '');
    if ($token === '' || !hash_equals((string) ($record['owner_hash'] ?? ''), hash('sha256', $token))) {
        respond(403, ['error' => 'You do not have permission to edit this invitation.']);
    }

    respond(200, [
        'id' => $id,
        'published' => !empty($record['published']),
        'revision' => (int) ($record['revision'] ?? 0),
        'config' => $record['config'],
        'adminEmail' => $record['recipient'],
    ]);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $action = (string) ($_GET['action'] ?? '');
    $id = (string) ($_GET['id'] ?? '');
    if (!validId($id)) {
        respond(400, ['error' => 'The invitation link is invalid.']);
    }

    $record = loadRecord($id);
    if (!$record) {
        respond(404, ['error' => 'This invitation was not found.']);
    }
    if ($action === 'manage') {
        managementRecord($id, $record);
    }
    if ($action === 'version') {
        if (empty($record['published'])) {
            respond(404, ['error' => 'This invitation has not been published.']);
        }
        respond(200, ['revision' => (int) ($record['revision'] ?? 0)]);
    }
    if ($action !== 'load') {
        respond(400, ['error' => 'The requested publishing action is invalid.']);
    }
    if (empty($record['published'])) {
        respond(404, ['error' => 'This invitation has not been published.']);
    }

    respond(200, [
        'id' => $id,
        'revision' => (int) ($record['revision'] ?? 0),
        'config' => publicConfig($record),
    ]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'This publishing action is not supported.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_CONFIG_BYTES) {
    respond(413, ['error' => 'This design is too large to publish. Reduce the image sizes and try again.']);
}

$request = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($request)) {
    respond(400, ['error' => 'The publishing request could not be read.']);
}

$action = (string) ($request['action'] ?? '');
$config = $request['config'] ?? null;
$recipient = filter_var($request['adminEmail'] ?? '', FILTER_VALIDATE_EMAIL);
if (!in_array($action, ['publish', 'save'], true) ||
    !is_array($config) ||
    !is_array($config['couple'] ?? null) ||
    !is_array($config['wedding'] ?? null) ||
    !is_array($config['venue'] ?? null) ||
    !is_array($config['content'] ?? null) ||
    !is_array($config['images'] ?? null)) {
    respond(422, ['error' => 'The invitation design or publishing action is invalid.']);
}

$configJson = json_encode($config, JSON_UNESCAPED_SLASHES);
if (!is_string($configJson) || strlen($configJson) > MAX_CONFIG_BYTES) {
    respond(413, ['error' => 'This design is too large to publish. Reduce the image sizes and try again.']);
}

if ($action === 'publish' && !$recipient) {
    respond(422, ['error' => 'Enter a valid admin email to receive RSVP replies.']);
}

$id = (string) ($request['id'] ?? '');
$token = (string) ($_SERVER['HTTP_X_INVITATION_TOKEN'] ?? '');
$now = time();

if ($action === 'publish' && $id === '') {
    if (session_status() !== PHP_SESSION_ACTIVE && !session_start()) {
        respond(503, ['error' => 'Publishing is temporarily unavailable.']);
    }
    $publishAttempts = $_SESSION['publish_attempts'] ?? [];
    $publishAttempts = array_values(array_filter(
        is_array($publishAttempts) ? $publishAttempts : [],
        static fn ($timestamp): bool => is_int($timestamp) && $timestamp > $now - 3600
    ));
    if (count($publishAttempts) >= 5) {
        respond(429, ['error' => 'Too many invitations were published from this browser. Try again later.']);
    }

    try {
        $id = bin2hex(random_bytes(12));
        $token = bin2hex(random_bytes(32));
    } catch (Throwable $error) {
        error_log('Could not generate invitation publishing credentials.');
        respond(500, ['error' => 'Publishing could not create secure invitation credentials.']);
    }
    $maxGuests = filter_var($config['rsvp']['maxGuests'] ?? 2, FILTER_VALIDATE_INT);
    $record = [
        'id' => $id,
        'owner_hash' => hash('sha256', $token),
        'recipient' => $recipient,
        'max_guests' => $maxGuests !== false ? max(1, min(20, $maxGuests)) : 2,
        'config' => $config,
        'published' => true,
        'revision' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ];
    if (!storeRecord($record, true)) {
        respond(500, ['error' => 'The invitation could not be saved. Please try again.']);
    }
    $_SESSION['publish_attempts'][] = $now;
    respond(201, [
        'id' => $id,
        'token' => $token,
        'published' => true,
        'revision' => 1,
        'url' => invitationUrl($id),
    ]);
}

if (!validId($id) || $token === '') {
    respond(401, ['error' => 'Invitation editing credentials are missing or invalid.']);
}
$record = loadRecord($id);
if (!$record || !hash_equals((string) ($record['owner_hash'] ?? ''), hash('sha256', $token))) {
    respond(403, ['error' => 'You do not have permission to edit this invitation.']);
}
if ($action === 'save' && !$recipient) {
    respond(422, ['error' => 'Enter a valid admin email to keep RSVP delivery active.']);
}

$maxGuests = filter_var($config['rsvp']['maxGuests'] ?? 2, FILTER_VALIDATE_INT);
$record['config'] = $config;
$record['recipient'] = $recipient;
$record['max_guests'] = $maxGuests !== false ? max(1, min(20, $maxGuests)) : 2;
$record['published'] = true;
$record['revision'] = (int) ($record['revision'] ?? 0) + 1;
$record['updated_at'] = $now;

if (!storeRecord($record)) {
    respond(500, ['error' => 'The invitation changes could not be saved.']);
}

respond(200, [
    'id' => $id,
    'published' => true,
    'revision' => $record['revision'],
    'url' => invitationUrl($id),
]);

function invitationUrl(string $id): string
{
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $scheme = $https ? 'https://' : 'http://';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    if (preg_match('/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?)(?::[0-9]{1,5})?$/', $host) !== 1) {
        $host = 'localhost';
    }
    $directory = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/php/publish.php')));
    $base = rtrim($directory, '/');
    if (substr($base, -4) === '/php') {
        $base = substr($base, 0, -4);
    }
    return $scheme . $host . ($base !== '' ? $base : '') . '/index.html?invite=' . rawurlencode($id);
}
