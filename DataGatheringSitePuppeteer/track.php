<?php
require_once 'includes/db.php'; // assumes $dbconn is a MySQLi connection

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Read JSON input
$data = json_decode(file_get_contents("php://input"), true);

// Extract fields
$session_id = $data['sessionId'];
$user_agent = mysqli_real_escape_string($dbconn, $data['userAgent']);
$ip_address = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$start_time = date('Y-m-d H:i:s', $data['startTime'] / 1000);
$end_time   = date('Y-m-d H:i:s', $data['endTime'] / 1000);
$page_url   = mysqli_real_escape_string($dbconn, $data['page']);
$viewed_at  = $start_time;
$time_spent = $data['timeSpentSeconds'] ?? 0;

// 1. Insert session if not exists
$stmt = $dbconn->prepare("INSERT IGNORE INTO sessions (id, ip_address, user_agent, start_time, end_time) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("sssss", $session_id, $ip_address, $user_agent, $start_time, $end_time);
$stmt->execute();
$stmt->close();

// 2. Insert page view
$stmt = $dbconn->prepare("
    INSERT INTO page_views (session_id, page_url, sequence_index, time_spent_seconds, viewed_at)
    VALUES (?, ?, ?, ?, ?)
");
$seq_index = $data['sequenceIndex'] ?? 0;
$stmt->bind_param("ssiis", $session_id, $page_url, $seq_index, $time_spent, $viewed_at);
$stmt->execute();
$pageViewId = $stmt->insert_id;
$stmt->close();

// 3. Scroll behaviour
$scroll = $data['scroll'];
$stmt = $dbconn->prepare("
    INSERT INTO scroll_behaviour (page_views_id, max_scroll_depth, avg_scroll_speed, scroll_direction, total_scroll_events)
    VALUES (?, ?, ?, ?, ?)
");
$stmt->bind_param("iddsi", $pageViewId, $scroll['maxDepth'], $scroll['avgSpeed'], $scroll['direction'], $scroll['totalEvents']);
$stmt->execute();
$stmt->close();

// 4. Mouse movements
$mouse = $data['mouse'];
$idle_time = $mouse['idleTime'] ?? 0;
$stmt = $dbconn->prepare("
    INSERT INTO mouse_movements (page_views_id, total_distance, avg_speed, max_speed, idle_time, sharp_turns, straight_movements)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->bind_param("idddiii", $pageViewId, $mouse['totalDistance'], $mouse['avgSpeed'], $mouse['maxSpeed'], $idle_time, $mouse['sharpTurns'], $mouse['straightMovements']);
$stmt->execute();
$stmt->close();

// 5. Keyboard patterns
$keyboard = $data['keyboard'];
$stmt = $dbconn->prepare("
    INSERT INTO keyboard_patterns (page_views_id, avg_time_between_keys, shortcut_use)
    VALUES (?, ?, ?)
");
$stmt->bind_param("ids", $pageViewId, $keyboard['avgTimeBetweenKeys'], $keyboard['shortcutUse']);
$stmt->execute();
$stmt->close();

// 6. Click events
$clicks = $data['clicks'] ?? [];
$stmt = $dbconn->prepare("
    INSERT INTO click_events (page_view_id, click_type, click_timestamp, time_since_last_click)
    VALUES (?, ?, FROM_UNIXTIME(? / 1000), ?)
");
foreach ($clicks as $click) {
    $click_ts = $click['clickTimestamp'];
    $click_type = $click['clickType'];
    $time_diff = $click['timeSinceLastClick'];
    $stmt->bind_param("issi", $pageViewId, $click_type, $click_ts, $time_diff);
    $stmt->execute();
}
$stmt->close();

// Done
http_response_code(200);
echo json_encode(["status" => "ok"]);
