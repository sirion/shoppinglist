<?php
// Main API entry point

require_once dirname(dirname(__DIR__)) . "/backend/shoppinglist.php";
$sl = new Shoppinglist();
$sl->serve();
