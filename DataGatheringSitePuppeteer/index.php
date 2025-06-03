<?php
require_once 'includes/db.php'; // Make sure this sets up a MySQLi connection as $dbconn

ini_set('display_errors', 1);
error_reporting(E_ALL);

// Fetch all articles ordered by title (latest first)
$query = "SELECT id, title, summary FROM articles ORDER BY title DESC";
$result = mysqli_query($dbconn, $query);

if (!$result) {
    die("Error fetching articles: " . mysqli_error($dbconn));
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Fake News Blog</title>
    <link rel="stylesheet" href="./assets/css/style.css">
    <script src="./assets/js/tracking.js" defer></script>
</head>
<body>
    <header>
        <h1>📰 Fake News Blog</h1>
        <p>Stay updated with totally unreliable information!</p>
    </header>

    <main>
        <?php while ($row = mysqli_fetch_assoc($result)): ?>
            <article>
                <h2><a href="to_article.php?id=<?= htmlspecialchars($row['id']) ?>">
                        <?= htmlspecialchars($row['title']) ?>
                    </a></h2>
                <p><?= htmlspecialchars($row['summary']) ?></p>
                <a href="to_article.php?id=<?= htmlspecialchars($row['id']) ?>">Read more →</a>
            </article>
            <hr>
        <?php endwhile; ?>
    </main>
</body>

</html>
