<?php
require_once 'includes/db.php'; // Make sure this sets up a MySQLi connection as $dbconn

// Simple UUID v4 generator moved from postgresql lel
function generateUUIDv4() {
    return sprintf(
        '%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

$lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed vitae sem in lacus cursus luctus. ";
$summary = substr($lorem, 0, 100) . "...";

for ($i = 1; $i <= 100; $i++) {
    $id = generateUUIDv4();
    $title = "Fake Article $i";
    $content = str_repeat($lorem, rand(300, 400));

    // Use prepared statements to avoid SQL injection
    $stmt = mysqli_prepare($dbconn, "INSERT INTO articles (id, title, summary, content) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        echo "Failed to prepare statement for article $i: " . mysqli_error($dbconn) . "<br>";
        continue;
    }

    mysqli_stmt_bind_param($stmt, "ssss", $id, $title, $summary, $content);

    if (!mysqli_stmt_execute($stmt)) {
        echo "Failed to insert article $i: " . mysqli_stmt_error($stmt) . "<br>";
    } else {
        echo "Inserted article $i<br>";
    }

    mysqli_stmt_close($stmt);
}
?>
