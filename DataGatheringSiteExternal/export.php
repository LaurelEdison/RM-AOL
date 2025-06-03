<?php
$mysqli = new mysqli("localhost", "root", "", "rmaolexternalbot");
header('Content-Type: text/csv');
header('Content-Disposition: attachment; filename="s.csv"');

$query = "
  SELECT
  s.id AS session_id,
  TIMESTAMPDIFF(SECOND, s.start_time, s.end_time) AS session_duration,
  COUNT(DISTINCT pv.id) AS pages_visited,
  AVG(pv.time_spent_seconds) AS avg_time_per_page,

  -- Mouse movements
  AVG(mm.total_distance) AS mouse_distance_avg,
  AVG(mm.avg_speed) AS mouse_avg_speed,
  AVG(mm.max_speed) AS mouse_max_speed,
  AVG(mm.idle_time) AS mouse_idle_time,
  AVG(mm.sharp_turns) AS mouse_sharp_turns,
  AVG(mm.straight_movements) AS mouse_straight_movements,

  -- Scroll behavior
  AVG(sb.max_scroll_depth) AS avg_scroll_depth,
  AVG(sb.avg_scroll_speed) AS avg_scroll_speed,
  SUM(sb.total_scroll_events) AS total_scrolls,

  -- Click events
  COUNT(ce.id) AS total_clicks,
  AVG(ce.time_since_last_click) AS avg_time_between_clicks,

  -- Keyboard patterns
  AVG(kb.avg_time_between_keys) AS avg_typing_speed,
  AVG(kb.shortcut_use) AS avg_shortcut_use

FROM (
  SELECT s.*
  FROM sessions s
  JOIN page_views pv ON s.id = pv.session_id
  JOIN mouse_movements mm ON pv.id = mm.page_views_id
  GROUP BY s.id
  HAVING AVG(mm.total_distance) > 0
  ORDER BY s.start_time ASC
  LIMIT 1000
) s
LEFT JOIN page_views pv ON s.id = pv.session_id
LEFT JOIN mouse_movements mm ON pv.id = mm.page_views_id
LEFT JOIN scroll_behaviour sb ON pv.id = sb.page_views_id
LEFT JOIN click_events ce ON pv.id = ce.page_view_id
LEFT JOIN keyboard_patterns kb ON pv.id = kb.page_views_id

GROUP BY s.id;

";

$result = $mysqli->query($query);
if (!$result) {
  http_response_code(500);
  echo "SQL error: " . $mysqli->error;
  exit;
}

$out = fopen("php://output", "w");

// Header row
$fields = $result->fetch_fields();
fputcsv($out, array_column($fields, 'name'));

// Data rows
while ($row = $result->fetch_assoc()) {
  fputcsv($out, $row);
}

fclose($out);
$mysqli->close();
?>
