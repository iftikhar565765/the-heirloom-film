/* Guest Submissions page — reads the private edit key from this browser
   and lists every RSVP stored for the invitation. No data leaves the page
   except the optional CSV the owner downloads themselves.                */
(function () {
  'use strict';

  var stateBox = document.getElementById('submissions-state');
  var summary = document.getElementById('submissions-summary');
  var list = document.getElementById('submissions-list');
  var title = document.getElementById('submissions-title');
  var refreshButton = document.getElementById('refresh-replies');
  var csvButton = document.getElementById('download-csv');
  var currentReplies = [];

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function showState(message) {
    stateBox.hidden = false;
    stateBox.textContent = message;
  }

  function hideState() {
    stateBox.hidden = true;
  }

  function readToken(id) {
    try { return window.localStorage.getItem('heirloom-owner:' + id) || ''; }
    catch (error) { return ''; }
  }

  function formatDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return '';
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return date.getDate() + ' ' + MONTHS[date.getMonth()] + ' ' + date.getFullYear() +
      ' · ' + hours + ':' + minutes;
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function renderHeading(config) {
    var couple = config && config.couple && typeof config.couple.namesLine === 'string'
      ? config.couple.namesLine.trim() : '';
    if (!couple) return;
    clearNode(title);
    title.textContent = 'Replies for ' + couple;
  }

  function renderReply(reply) {
    var item = document.createElement('li');
    item.className = 'reply-card' + (reply.attendance === 'attending' ? '' : ' reply-card--declined');

    var head = document.createElement('div');
    head.className = 'reply-card__head';
    var name = document.createElement('strong');
    name.textContent = reply.name;
    var badge = document.createElement('span');
    badge.className = 'reply-badge' + (reply.attendance === 'attending' ? ' reply-badge--attending' : '');
    badge.textContent = reply.attendance === 'attending' ? 'Attending' : 'Declining';
    head.appendChild(name);
    head.appendChild(badge);
    item.appendChild(head);

    var seats = Number(reply.guests) || 0;
    var metaBits = [seats + (seats === 1 ? ' guest' : ' guests')];
    var when = formatDate(reply.created_at);
    if (when) metaBits.push(when);
    var meta = document.createElement('p');
    meta.className = 'reply-card__meta';
    meta.textContent = metaBits.join(' · ');
    item.appendChild(meta);

    if (reply.email) {
      var email = document.createElement('p');
      email.className = 'reply-card__note';
      email.textContent = 'Email: ' + reply.email;
      item.appendChild(email);
    }
    if (reply.dietary) {
      var dietary = document.createElement('p');
      dietary.className = 'reply-card__note';
      dietary.textContent = 'Dietary: ' + reply.dietary;
      item.appendChild(dietary);
    }
    if (reply.message) {
      var message = document.createElement('p');
      message.className = 'reply-card__note reply-card__message';
      message.textContent = '“' + reply.message + '”';
      item.appendChild(message);
    }
    return item;
  }

  function render(replies, config) {
    currentReplies = replies;
    var attending = 0, declined = 0, seats = 0;
    replies.forEach(function (reply) {
      if (reply.attendance === 'attending') { attending += 1; seats += Number(reply.guests) || 0; }
      else declined += 1;
    });
    document.getElementById('sum-replies').textContent = String(replies.length);
    document.getElementById('sum-attending').textContent = String(attending);
    document.getElementById('sum-declined').textContent = String(declined);
    document.getElementById('sum-seats').textContent = String(seats);
    summary.hidden = false;

    renderHeading(config);
    clearNode(list);
    if (!replies.length) {
      showState('No replies yet. Share your live invitation link and every response will gather here automatically.');
      return;
    }
    var fragment = document.createDocumentFragment();
    replies.forEach(function (reply) { fragment.appendChild(renderReply(reply)); });
    list.appendChild(fragment);
  }

  function load() {
    var id = (new URLSearchParams(window.location.search).get('edit') ||
      new URLSearchParams(window.location.search).get('invite') || '').trim();
    if (!/^[a-f0-9]{24}$/.test(id)) {
      showState('Open this page through your editor: publish your invitation, then choose “View submissions”.');
      refreshButton.disabled = true;
      return;
    }
    var token = readToken(id);
    if (!token) {
      showState('This browser does not hold the private edit key for this invitation. Open your edit link in this browser first, then return here.');
      return;
    }
    refreshButton.disabled = true;
    showState('Fetching your replies…');
    fetch('/api/publish?action=manage&id=' + encodeURIComponent(id) + '&limit=1000', {
      headers: { 'Accept': 'application/json', 'X-Invitation-Token': token }
    }).then(function (response) {
      if (response.status === 403) { throw new Error('key'); }
      if (!response.ok) { throw new Error('load'); }
      return response.json();
    }).then(function (result) {
      refreshButton.disabled = false;
      var replies = result.responses || [];
      csvButton.hidden = !replies.length;
      render(replies, result.config);
      if (replies.length) hideState();
    }).catch(function (error) {
      refreshButton.disabled = false;
      showState(error && error.message === 'key'
        ? 'This browser does not hold the private edit key for this invitation. Open your edit link in this browser first, then return here.'
        : 'The replies could not be loaded just now. Check your connection and press Refresh.');
    });
  }

  function csvCell(value) {
    var text = String(value == null ? '' : value).replace(/[\r\n]+/g, ' ');
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsv() {
    if (!currentReplies.length) return;
    var rows = [['Name', 'Attendance', 'Seats', 'Dietary requirements', 'Message', 'Submitted']];
    currentReplies.forEach(function (reply) {
      rows.push([
        reply.name,
        reply.attendance === 'attending' ? 'Attending' : 'Declining',
        Number(reply.guests) || 0,
        reply.dietary || '',
        reply.message || '',
        formatDate(reply.created_at)
      ]);
    });
    var csv = '\ufeff' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'guest-submissions.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
  }

  refreshButton.addEventListener('click', load);
  csvButton.addEventListener('click', downloadCsv);
  load();
})();
