<?php
$host = "localhost";
$user = "root";
$password = "";
$db_name = "rmaolplaywrightdata";

// Connect to MySQL using MySQLi
$dbconn = mysqli_connect($host, $user, $password, $db_name);

// Check connection
if (!$dbconn) {
    die("Database connection failed: " . mysqli_connect_error());
}
?>
