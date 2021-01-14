<?php

class Errors {

	const Invalid_API     = [ "e01", "Invalid API Request" ];
	const Invalid_Body    = [ "e03", "Invalid Request Body" ];
	const Invalid_Delete  = [ "e05", "Invalid Delete Request" ];
	const List_Not_Found  = [ "e06", "List not Found" ];

	const NYI_Delete_List = [ "e96", "Deleting lists is not possible" ];
	const NYI_Create_List = [ "e97", "Creating lists is not possible"];
	const NYI             = [ "e98", "Not Yet Implemented" ];
}




class Shoppinglist {

	//////////////////////////////////// Static Members ////////////////////////////////////

	private static $instance = null;

	public static function serveAPI() {
		self::$instance->serve();
	}

	public static function init() {
		Shoppinglist::$instance = new Shoppinglist();
	}




	//////////////////////////////////// Private Properties ////////////////////////////////////

	private $listFile = __DIR__ . "/data/list.json";

	private $lists = [
		"main" => [
			"active" => [
				// [ "category" => "abc", "color" => "#000", "name" => "abc", "amount" => [ "number" => 100, "unit" => "g" ] ],
			],
			"inactive" => [
				// [ "category" => "abc", "color" => "#000", "name" => "abc", "amount" => [ "number" => 100, "unit" => "g" ] ],
			]
		]
	];


	//////////////////////////////////// Constructor ////////////////////////////////////

	public function __construct() {
		if (file_exists($this->listFile)) {
			$this->lists = json_decode(file_get_contents($this->listFile), true);
		} else {
			echo "{$this->listFile} NOT FOUND... ";
			die();
		}
		if (!isset($this->lists)) {
			$this->lists = [];
		}
		if (!isset($this->lists["main"])) {
			$this->lists["main"] = [];
		}
		if (!isset($this->lists["main"]["active"])) {
			$this->lists["main"]["active"] = [
				// [ "category" => "1", "color" => "#000", "name" => "abc", "amount" => [ "number" => 100, "unit" => "g" ] ],
				// [ "category" => "2", "color" => "#333", "name" => "abc", "amount" => [ "number" => 723, "unit" => "kg" ] ],
				// [ "category" => "3", "color" => "#666", "name" => "abc", "amount" => [ "number" => 12, "unit" => "pcs" ] ],
				// [ "category" => "4", "color" => "#999", "name" => "abc", "amount" => [ "number" => 1, "unit" => "" ] ],
				// [ "category" => "5", "color" => "#ccc", "name" => "abc", "amount" => [ "number" => 1, "unit" => "" ] ],
				// [ "category" => "6", "color" => "#fff", "name" => "abc", "amount" => [ "number" => 1, "unit" => "" ] ],
			];
		}
		if (!isset($this->lists["main"]["inactive"])) {
			$this->lists["main"]["inactive"] = [
				// [ "category" => "unfug", "color" => "red", "name" => "abc", "amount" => [ "number" => 1, "unit" => "" ] ],
				// [ "category" => "getränke", "color" => "blue", "name" => "abc", "amount" => [ "number" => 1, "unit" => "" ] ],
				// [ "category" => "gemüse", "color" => "green", "name" => "abc", "amount" => [ "number" => 1, "unit" => "" ] ],
				// [ "category" => "süßkram", "color" => "yellow", "name" => "abc abc abc abc abc abc abc abc abc abc abc abc abc abc abc", "amount" => [ "number" => 1, "unit" => "" ] ],
			];
		}
	}

	//////////////////////////////////// Public Methods ////////////////////////////////////

	public function serve() {
		$actions = isset($_REQUEST["action"]) ? explode("/", trim($_REQUEST["action"], "/")) : [];
		$action = array_shift($actions);

		// header("Content-Type: application/json");
		// echo json_encode([
		// 	"action" => $action,
		// 	"parts" => $actions
		// ]);


		switch ($action) {

			case "":
				$output = $this->getInfo();
				break;

			case "lists":
				$output = $this->getList($actions);
				break;


			default:
				$output = $this->error(Errors::NYI);
				break;

		}


		$contentType = "application/json";
		if (isset($output["contentType"])) {
			$contentType = $output["contentType"];
			unset($output["contentType"]);
		}

		if (isset($output["status"])) {
			http_response_code($output["status"]);
			unset($output["status"]);
		}

		header("Content-Type: ". $contentType);
		echo json_encode($output);
	}

	public function getInfo() {
		return [
			"name" => "misl",
			"version" => "0.1.1",
		];
	}

	public function getList($actions) {
		if ($_SERVER["REQUEST_METHOD"] === "GET") {
			// Show lists
			if (count($actions) === 0) {
				// Show list names
				return array_keys($this->lists);
			} else if (count($actions) === 1) {
				// Show specific list
				$listName = array_shift($actions);
				if (isset($this->lists[$listName])) {
					return $this->lists[$listName];
				} else {
					return $this->error(Errors::List_Not_Found, [ "listName" => $listName ]);
				}
			} else {
				return $this->error(Errors::Invalid_API);
			}
		} else if ($_SERVER["REQUEST_METHOD"] === "POST") {
			// Special actions
			$numParts = count($actions);
			if ($numParts === 0) {
				// Not possibe to post on a category
				return $this->error(Errors::Invalid_API);
			} else if ($numParts === 1) {
				// Not possibe to post on a a list
				return $this->error(Errors::Invalid_API);
			} else if ($numParts === 2) {
				// Not possibe to post on a listType
				return $this->error(Errors::Invalid_API);
			} else if ($numParts === 3) {
				$listName = array_shift($actions);
				$listType = array_shift($actions);
				$entryKey = array_shift($actions);

				if ($listType === "active" || $listType === "inactive") {
					return $this->switchItem($listName, $listType, $entryKey);
				} else {
					return $this->error(Errors::Invalid_API);
				}
			} else {
				return $this->error(Errors::Invalid_API);
			}


		} else if ($_SERVER["REQUEST_METHOD"] === "PUT") {
			if (count($actions) === 1) {
				// Create new Item
				$listName = array_shift($actions);
				return $this->addItem($listName);
			} else if (count($actions) === 0) {
				// Create new list
				return $this->error(Errors::NYI_Create_List);
			} else {
				return $this->error(Errors::Invalid_API);
			}

		} else if ($_SERVER["REQUEST_METHOD"] === "DELETE") {
			if (count($actions) === 3) {
				// Delete item
				$listName = array_shift($actions);
				$listType = array_shift($actions);
				$entryKey = array_shift($actions);
				return $this->removeItem($listName, $listType, $entryKey);
			} else if (count($actions) === 0) {
				// Delete list
				return $this->error(Errors::NYI_Delete_List);
			} else {
				return $this->error(Errors::Invalid_API);
			}

		} else {
			return $this->error(Errors::Invalid_API);
		}

		return $this->error(Errors::Invalid_API, [
			"actions" => $actions
		]);
	}

	public function addItem($listname) {
		$item = $this->getRequestBodyData();



		if (!$item) {
			return $this->error(Errors::Invalid_Body, $ex->getMessage());
		}


		if (empty($item["category"])) {
			return $this->error(Errors::Invalid_Body, "Missing field: 'cagetory'");
		}
		if (empty($item["name"])) {
			return $this->error(Errors::Invalid_Body, "Missing field: 'name'");
		}
		if (empty($item["amount"])) {
			return $this->error(Errors::Invalid_Body, "Missing field: 'amount'");
		}

		array_push($this->lists[$listname]["active"], $item);
		$this->saveList();

		return [ "status" => 204 ];
	}



	private function checkItemValidity($listname, $listType, $entryKey, $receivedItem) {
		if (!isset($this->lists[$listname])) {
			return $this->error(Errors::Invalid_Delete, "Item Not Found");
		}

		if ($listType !== "active" && $listType !== "inactive") {
			return $this->error(Errors::Invalid_Delete, "Invalid list type");
		}


		$originalItem = isset($this->lists[$listname][$listType][$entryKey]) ? $this->lists[$listname][$listType][$entryKey] : false;
		if ($originalItem) {
			if (
				$receivedItem["category"] !== $originalItem["category"] &&
				$receivedItem["name"]     !== $originalItem["name"] &&
				$receivedItem["amount"]   !== $originalItem["amount"]
			) {
				return $this->error(Errors::Invalid_Delete, "Item Data Does Not Match");
			}
		} else {
			return $this->error(Errors::Invalid_Delete, "Item Not Found");
		}

		return null;
	}

	public function removeItem($listname, $listType, $entryKey) {
		$item = $this->getRequestBodyData();
		$error = $this->checkItemValidity($listname, $listType, $entryKey, $item);
		if ($err !== null) {
			return $err;
		}

		$originalItem = $this->lists[$listname][$listType][$entryKey];

		// array_push($this->lists[$listname]["inactive"], $originalItem);
		// unset($this->lists[$listname]["active"][$entryKey]);
		array_splice($this->lists[$listname][$listType], $entryKey, 1);
		$this->saveList();

		return [ "status" => 204 ];
	}

	public function switchItem($listName, $listType, $entryKey) {
		$item = $this->getRequestBodyData();
		$error = $this->checkItemValidity($listName, $listType, $entryKey, $item);
		if ($error !== null) {
			return $error;
		}

		$originalItem = $this->lists[$listName][$listType][$entryKey];

		if ($listType === "active") {
			// Deactivate
			array_push($this->lists[$listName]["inactive"], $originalItem);
			array_splice($this->lists[$listName]["active"], $entryKey, 1);
		} else {
			// Activate
			array_push($this->lists[$listName]["active"], $originalItem);
			array_splice($this->lists[$listName]["inactive"], $entryKey, 1);
		}
		$this->saveList();

		return [ "status" => 200 ];
	}

	//////////////////////////////////// Private Methods ////////////////////////////////////

	private function saveList() {
		// TODO: Order List
		$sortByCategory = function($a, $b) {
			if ($a["category"] == $b["category"]) {
				return 0;
			}
			return $a["category"] > $b["category"] ? 1 : -1;
		};

		foreach ($this->lists as $key => $list) {
			usort($list["active"], $sortByCategory);
			usort($list["inactive"], $sortByCategory);
		}

		file_put_contents($this->listFile, json_encode($this->lists));
	}

	private function error($error, $details = null) {
		$err = [
			"type" => "error",
			"code" => $error[0],
			"message" => $error[1]
		];

		if (!empty($details)) {
			$err["details"] = $details;
		}

		$err["debug"] = debug_backtrace();

		return $err;
	}

	private function getRequestBodyData() {
		$body = "";
		$putInput = fopen("php://input", "r");
		while ($data = fread($putInput, 1024)) {
			$body .= $data;
		}
		fclose($putInput);

		try {
			return json_decode($body, true);
		} catch (Exception $ex) {
			return false;
		}

	}


}
Shoppinglist::init();