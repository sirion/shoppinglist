<?php

$url = $_SERVER["REQUEST_URI"];
$base = dirname(__DIR__);

if (substr($url, 0, 5) === "/api/") {
	$_REQUEST["action"] = substr($url, 5);
	require $base . "/frontend/api/index.php";
	
} else {
	if ($url === "") {
		$url = "/";
	}

	$filePath = $base . "/frontend" . $url;
	if (substr($url, -1) === "/") {
		if (file_exists($filePath . "index.html")) {
			$filePath .= "index.html";
		} else if (file_exists($filePath . "index.php")) {
			$filePath .= "index.php";
		}
	}

	if (!file_exists($filePath)) {
		return false;
	} else {
		error_log("Serving $filePath...");
		if (substr($filePath, -3) === ".js") {
			$mimeType = "application/javascript";
		} else if (substr($filePath, -4) === ".css") {
			$mimeType = "text/css";
		} else if (substr($filePath, -5) === ".json") {
			$mimeType = "application/json";
		} else {
			$mimeType = mime_content_type($filePath);
		}

		header("Content-Type: " . $mimeType);
		include $filePath;
	}
}
