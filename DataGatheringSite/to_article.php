<?php
require_once 'includes/db.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

$id = $_GET['id'] ?? '';

if (!$id) {
    die("No article ID provided.");
}

// Use prepared statements to prevent SQL injection
$query = "SELECT title, content, summary FROM articles WHERE id = ?";
$stmt = mysqli_prepare($dbconn, $query);

if (!$stmt) {
    die("Query preparation failed: " . mysqli_error($dbconn));
}

mysqli_stmt_bind_param($stmt, "s", $id);
mysqli_stmt_execute($stmt);

$result = mysqli_stmt_get_result($stmt);

if (!$result) {
    die("Query execution error: " . mysqli_error($dbconn));
}

$article = mysqli_fetch_assoc($result);

if (!$article) {
    die("Article not found.");
}

mysqli_stmt_close($stmt);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= htmlspecialchars($article['title']) ?></title>
    <link rel="stylesheet" href="./assets/css/style.css"> 
    <script src="./assets/js/tracking.js" defer></script>
</head>
<body>
    <header>
        <h1><a href="index.php">📰 Fake News Blog</a></h1>
    </header>

    <main>
        <article>
            <h2><?= htmlspecialchars($article['title']) ?></h2>
            <small>Summary: <?= htmlspecialchars($article['summary']) ?></small>
            <p><?= nl2br(htmlspecialchars($article['content'])) ?></p>
        </article>
    </main>
</body>
</html>
