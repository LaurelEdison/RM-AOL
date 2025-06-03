<?php
// DB config
$mysqli = new mysqli("localhost", "root", "", "rmaolexternalbot");

// Check connection
if ($mysqli->connect_error) {
    http_response_code(500);
    echo "❌ Connection failed: " . $mysqli->connect_error;
    exit;
}

// Disable foreign key checks
$mysqli->query("SET FOREIGN_KEY_CHECKS = 0");

$tables = [
    "click_events",
    "keyboard_patterns",
    "mouse_movements",
    "page_views",
    "scroll_behaviour",
    "sessions"
];

$errors = [];

foreach ($tables as $table) {
    $sql = "TRUNCATE TABLE `$table`";
    if (!$mysqli->query($sql)) {
        $errors[] = "❌ Failed to truncate `$table`: " . $mysqli->error;
    }
}

// Re-enable foreign key checks
$mysqli->query("SET FOREIGN_KEY_CHECKS = 1");

$mysqli->close();

// Output result
if (empty($errors)) {
    echo "✅ All tables truncated successfully.";
} else {
    foreach ($errors as $err) {
        echo $err . "<br>";
    }
}
?>
