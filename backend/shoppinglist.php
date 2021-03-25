<?php
// error_reporting(0); // Production
error_reporting(-1); // Debugging

class Errors {

	const Invalid_API                      = [ "e01", "Invalid API request", 400 ];
	const Invalid_Body                     = [ "e03", "Invalid request body", 400 ];
	const Invalid_Item                     = [ "e05", "Invalid item data", 400 ];
	const List_Not_Found                   = [ "e06", "List not found", 404 ];
	const Invalid_Access_Code              = [ "e07", "Invalid access code", 401 ];
	const Invalid_ListType                 = [ "e08", "Invalid list type", 400 ];
	const Invalid_Listname                 = [ "e09", "List name must be filled and no longer than 60 characters", 400 ];
	const Storage_Access                   = [ "e10", "Error accessing list storage", 500 ];
	const Storage_Write_Access             = [ "e11", "No write access to list storage", 401 ];

	const Categories_Invalid_Payload       = [ "e12", "Invalid category request body", 400 ];
	const Categories_Name_Not_Set          = [ "e13", "Category name must be filled", 400 ];
	const Categories_Invalid_Color         = [ "e14", "Invalid category color value", 400 ];
	const Categories_More_Than_One_Default = [ "e15", "At most one category can be set as default", 400 ];
	const Categories_Duplicate_Name        = [ "e16", "Category names must be unique", 400 ];

	const Units_Invalid_Payload            = [ "e17", "Invalid unit request body", 400 ];
	const Units_Name_Not_Set               = [ "e18", "Unit name must be filled", 400 ];
	const Units_More_Than_One_Default      = [ "e19", "At most one unit can be set as default", 400 ];
	const Units_Duplicate_Name             = [ "e20", "Unit names must be unique", 400 ];



	const NYI_Delete_List                  = [ "e96", "Deleting a list is not possible", 500 ];
	const NYI_Create_List                  = [ "e97", "Creating a list is not possible", 500 ];
	const NYI                              = [ "e98", "Not Yet Implemented", 500 ];
	const Unknown                          = [ "e99", "Internal Server Error", 500 ];
}




class Shoppinglist {

	//////////////////////////////////// Private Properties ////////////////////////////////////

	private $listFile = null;
	private $writable = false;

	/////////////////////////////////// Public Static Methods //////////////////////////////////

	static public function createNewList($name) {
		return [
			"meta" => [
				"name" => $name,
				"changed" => time() * 1000
			],
			"active" => [
				// [ "category" => "abc", "name" => "abc", "number" => 100, "unit" => "g", "changed" => time() * 1000 ],
			],
			"inactive" => [
				// [ "category" => "abc", "name" => "abc", "number" => 100, "unit" => "g", "changed" => time() * 1000 ],
			],
			"units" => [
				[ "name" => "Stk", "default" => true, "changed" => time() * 1000 ],
				[ "name" => "Pkg", "default" => false, "changed" => time() * 1000 ],
				[ "name" => "g", "default" => false, "changed" => time() * 1000 ],
				[ "name" => "l", "default" => false, "changed" => time() * 1000 ],
				[ "name" => "ml", "default" => false, "changed" => time() * 1000 ],
			],
			"categories" => [
				// [ "name" => "xyz", "color" => "#ff0000", "default" => false, "changed" => time() * 1000 ]
				[ "name" => "Sonstiges", "color" => "#dddddd", "default" => true, "changed" => time() * 1000 ],
				[ "name" => "Kühl", "color" => "#ccccff", "default" => false, "changed" => time() * 1000 ],
				[ "name" => "Frisch", "color" => "#aaffaa", "default" => false, "changed" => time() * 1000 ],
				[ "name" => "Getränke", "color" => "#6666ff", "default" => false, "changed" => time() * 1000 ],
				[ "name" => "Snacks", "color" => "#ff8888", "default" => false, "changed" => time() * 1000 ],
			]
		];
	}


	//////////////////////////////////// Constructor ////////////////////////////////////

	public function __construct() {
	}


	//////////////////////////////////// Public Methods ////////////////////////////////////


	private function checkAccess() {
		if (empty($_SERVER['HTTP_X_ACCESS_CODE'])) {
			// No code
			return false;
		}
		$code = strtolower($_SERVER['HTTP_X_ACCESS_CODE']);
		if (preg_match('/^[a-z0-9]{4,12}$/i', $code) !== 1) {
			// Invalid code
			return false;
		}
		$this->listFile = __DIR__ . "/data/list-$code.json";

		if (file_exists($this->listFile)) {
			$this->writable = is_writable($this->listFile);
			$this->accessCode = $code;
			return true;
		} else {
			return false;
		}
	}

	private function loadList() {
		try {
			$this->list = json_decode(file_get_contents($this->listFile), true);

			if (!empty($this->list["main"])) {
				$this->list = $this->list["main"];
			}

			if (!isset($this->list)) {
				$this->list = [];
			}
			if (!isset($this->list["active"])) {
				$this->list["active"] = [];
			}
			if (!isset($this->list["inactive"])) {
				$this->list["inactive"] = [];
			}
			if (!isset($this->list["categories"])) {
				$this->list["categories"] = [];
			}
			if (!isset($this->list["units"])) {
				$this->list["units"] = [];
			}
			if (!isset($this->list["meta"])) {
				$this->list["meta"] = [
					"changed" => time() * 1000
				];
			}
			if (empty($this->list["meta"]["name"])) {
				$this->list["meta"]["name"] = "Einkaufsliste";
			}
			if (!isset($this->list["meta"]["changed"])) {
				$this->list["meta"]["changed"] = time() * 1000;
			}
		} catch (Exception $ex) {
			return false;
		}
		return true;
	}

	public function serve() {
		$actions = isset($_REQUEST["action"]) ? explode("/", trim($_REQUEST["action"], "/")) : [];
		$action = array_shift($actions);
		if ($action === "api") {
			$action = array_shift($actions);
		}

		// No valid access code needed.
		if ($action === "create" && $_SERVER["REQUEST_METHOD"] === "PUT") {
			$output = $this->createList();
		} else if (!$this->checkAccess()) {
			$output = $this->error(Errors::Invalid_Access_Code);
		} else if (!$this->loadList()) {
			$output = $this->error(Errors::Storage_Access);
		} else if ($action === "") {
			$output = $this->getInfo();
		} else if ($action === "feedback" && $_SERVER["REQUEST_METHOD"] === "PUT") {
			$code = $this->accessCode;
			$message = $this->getRequestBodyData(false);
			mail("jens@himmelrath.net", "[MISL] User Feedback ($code)", $message);
			$output = [ "status" => 204 ];
		} else if ($action === "ping") {
			$output = [ "status" => 204 ];
		} else if ($action === "list") {
			$output = $this->listActions($actions);
		} else {
			$output = $this->error(Errors::Invalid_API);
		}


		$status = 500;
		if (isset($output["status"])) {
			$status = $output["status"];
			unset($output["status"]);
		}



		http_response_code($status);
		if ($status === 204) {
			// No Body
		} else {
			header("Content-Type: application/json");
			echo json_encode($output);
		}
	}

	public function getInfo() {
		return [
			"name" => "misl",
			"version" => "0.2",
		];
	}

	private function generateMnemonicPassword($options = []) {
		// Default options
		$syllables = $options["syllables"] ?? 3;
		$digits = $options["digits"] ?? 0;
		$end = $options["end"] ?? true;

		$password = '';
		// Idea:
		// All languages have certain consonants that can follow each other in words
		// normally this means that these combinations are pronounceable.
		// There are of course exceptions to this, see "mnemonic".
		// For the english language the following consonant-groups are pronounceable.
		$consonantPhonemeGroups = array(
			'b', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'w', 'x', 'z',
			'bl', 'br',
			'ch', 'cl', 'cr',
			'dr', 'dw',
			'fl', 'fr',
			'gh', 'gl', 'gr',
			'kl', 'kr',
			'ph', 'pl', 'pr', 'ps',
			'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sw',
			'th', 'tr',
			'wh',
			// Any suggestions?
		);
		$vowelPhonemeGroups = array(
			'a', 'e', 'i', 'o', 'u', 'y',
			'ay', 'au',
			'eo', 'ey',
			'ou', 'oy',
		);
		$passwordEnd = array(
			'', '.', '!', '?',
		);

		$consonantCount = count($consonantPhonemeGroups);
		$vowelCount = count($vowelPhonemeGroups);
		$endCount = count($passwordEnd);

		for ($i = 0; $i < $syllables; $i++) {
			$tmpC = rand(0, $consonantCount - 1);
			$tmpV = rand(0, $vowelCount - 1);

			$password .= $consonantPhonemeGroups[$tmpC];
			$password .= $vowelPhonemeGroups[$tmpV];

			for ($n = 0; $n < $digits; $n++) {
				$password .= rand(0, 9);
			}
		}

		if ($end) {
			$tmpE = rand(0, $endCount - 1);
			$password .= $passwordEnd[$tmpE];
		}

		return $password;
	}

	public function createList() {
		$name = $this->getRequestBodyData(false);

		if (empty($name)) {
			return $this->error(Errors::Invalid_Listname);
		}

		if (strlen($name) > 60) {
			return $this->error(Errors::Invalid_Listname);
		}

		$codeOptions = [
			"syllables" => 2,
			"digits" => 2,
			"end" => false
		];
		$code = $this->generateMnemonicPassword($codeOptions);
		while (file_exists(__DIR__ . "/data/list-$code.json")) {
			$code = $this->generateMnemonicPassword($codeOptions);
		}

		$newList = json_encode(self::createNewList($name));
		$ok = file_put_contents(__DIR__ . "/data/list-$code.json", $newList, LOCK_EX);
		if ($ok === false) {
			return $this->error(Errors::Storage_Access);
		}

		// TODO: Check for $ok === strlen($newList) ?

		return [
			"status" => 200,
			"listCode" => $code
		];
	}



	public function listActions($actions) {
		// TODO: IMplement incremental units and category changes

		if ($_SERVER["REQUEST_METHOD"] === "GET") {
			// Show list
			if (count($actions) === 0) {
				// Show list names
				$output = $this->list;
				$output["status"] = 200;
				return $output;
			} else {
				return $this->error(Errors::Invalid_API);
			}
		} else if ($_SERVER["REQUEST_METHOD"] === "POST") {
			// Special actions
			$numParts = count($actions);
			if ($numParts === 0) {
				// Not possibe to post on a a list
				return $this->error(Errors::Invalid_API);
			} else if ($numParts === 1) {
				// Not possibe to post on a listType
				return $this->error(Errors::Invalid_API);
			} else if ($numParts === 2) {
				$listType = array_shift($actions);
				$entryKey = array_shift($actions);

				switch ($listType) {
					case "active":
					case "inactive":
						// Switch entry to other list
						return $this->switchItem($listType, $entryKey);

					default:
						return $this->error(Errors::Invalid_API);

				}
			} else {
				return $this->error(Errors::Invalid_API);
			}
		} else if ($_SERVER["REQUEST_METHOD"] === "PUT") {
			$numParts = count($actions);
			if ($numParts === 0) {
				// Create new Item
				return $this->addItem("active");
			} else if ($numParts === 1) {

				$target = array_shift($actions);
				switch ($target) {
					case "active":
					case "inactive":
						return $this->addItem($target);

					case "categories":
						return $this->saveCategories();

					case "units":
						return $this->saveUnits();

					default:
						return $this->error(Errors::Invalid_API);
				}
			} else if ($numParts === 2) {
				$listType = array_shift($actions);
				$entryKey = array_shift($actions);

				// Edit entry
				return $this->editItem($listType, $entryKey);
			} else {
				return $this->error(Errors::Invalid_API);
			}

		} else if ($_SERVER["REQUEST_METHOD"] === "DELETE") {
			if (count($actions) === 2) {
				// Delete item
				$listType = array_shift($actions);
				$entryKey = array_shift($actions);
				return $this->removeItem($listType, $entryKey);
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

	public function saveCategories() {
		$categories = $this->getRequestBodyData(true);

		// Validate Unit entries
		// - Must have a unique name
		// - Only one default set to true
		if (!is_array($categories)) {
			return $this->error(Errors::Categories_Invalid_Payload);
		}
		$names = [];
		$defaultFound = false;
		foreach ($categories as $category) {
			if (empty($category["name"])) {
				return $this->error(Errors::Categories_Name_Not_Set);
			}
			if (!empty($category["color"]) && preg_match("/^#[0-9a-f]{6,8}$/", $category["color"]) !== 1) {
				return $this->error(Errors::Categories_Invalid_Color);
			}
			if (isset($categories["default"]) && $categories["default"]) {
				if ($defaultFound) {
					return $this->error(Errors::Categories_More_Than_One_Default);
				}
				$defaultFound = true;
			}
			if (isset($names[$category["name"]])) {
				return $this->error(Errors::Categories_Duplicate_Name);
			}
			$names[$category["name"]] = true;
		}

		$this->list["categories"] = [];
		foreach ($categories as $category) {
			array_push($this->list["categories"], [
				"name" => $category["name"],
				"color" => $category["color"],
				"default" => $category["default"]
			]);
		}

		$this->saveList();
		return [ "status" => 204 ];
	}

	public function saveUnits() {
		$units = $this->getRequestBodyData(true);

		// Validate Unit entries
		// - Must have a unique name
		// - Only one default set to true
		if (!is_array($units)) {
			return $this->error(Errors::Units_Invalid_Payload);
		}
		$names = [];
		$defaultFound = false;
		foreach ($units as $unit) {
			if (empty($unit["name"])) {
				return $this->error(Errors::Units_Name_Not_Set);
			}
			if (isset($units["default"]) && $units["default"]) {
				if ($defaultFound) {
					return $this->error(Errors::Units_More_Than_One_Default);
				}
				$defaultFound = true;
			}
			if (isset($names[$unit["name"]])) {
				return $this->error(Errors::Units_Duplicate_Name);
			}
			$names[$unit["name"]] = true;
		}

		$this->list["units"] = [];
		foreach ($units as $unit) {
			array_push($this->list["units"], [
				"name" => $unit["name"],
				"default" => $unit["default"]
			]);
		}

		$this->saveList();
		return [ "status" => 204 ];
	}

	public function addItem($listType = "active") {
		$item = $this->getRequestBodyData();

		if (!isset($this->list[$listType])) {
			return $this->error(Errors::Invalid_ListType);
		}

		$error = $this->verifyEntry($item);
		if ($error !== null) {
			return $error;
		}

		$item["changed"] = time() * 1000;

		array_push($this->list[$listType], $item);
		$this->saveList();

		return [ "status" => 204 ];
	}

	private function verifyEntry($item) {

		if (!$item) {
			return $this->error(Errors::Invalid_Body, "Invalid Request Body");
		}
		if (empty($item["category"])) {
			return $this->error(Errors::Invalid_Body, "Missing field: 'cagetory'");
		}
		if (empty($item["name"])) {
			return $this->error(Errors::Invalid_Body, "Missing field: 'name'");
		}

		return null;
	}


	private function compareItem($listType, $entryKey, $receivedItem) {
		if ($receivedItem === null) {
			return $this->error(Errors::Invalid_Item, "No Item Data in Payload");
		}

		if ($listType !== "active" && $listType !== "inactive") {
			return $this->error(Errors::Invalid_Item, "Invalid list type");
		}


		$originalItem = isset($this->list[$listType][$entryKey]) ? $this->list[$listType][$entryKey] : false;
		if ($originalItem) {
			if (
				$receivedItem["category"] !== $originalItem["category"] ||
				$receivedItem["name"]     !== $originalItem["name"] ||
				$receivedItem["number"]   !== $originalItem["number"] ||
				$receivedItem["unit"]   !== $originalItem["unit"]
			) {
				return $this->error(Errors::Invalid_Item, "Item Data Does Not Match");
			}
		} else {
			return $this->error(Errors::Invalid_Item, "Item Not Found");
		}

		return null;
	}

	public function findItem($listType, $item) {
		foreach ($this->list[$listType] as $key => $entry) {
			if (
				$item["category"] == $entry["category"] &&
				$item["name"]     == $entry["name"] &&
				$item["number"]   == $entry["number"] &&
				$item["unit"]   == $entry["unit"]
			) {
				return $key;
			}
		}

		return false;
	}

	public function removeItem($listType, $entryKey) {
		$item = $this->getRequestBodyData();
		$error = $this->compareItem($listType, $entryKey, $item);
		if ($error !== null) {
			// Try finding the entry, it might have moved due to a request in between
			$entryKey = $this->findItem($listType, $item);
			if ($entryKey === false) {
				return $error;
			}
		}

		$originalItem = $this->list[$listType][$entryKey];

		// array_push($this->list["inactive"], $originalItem);
		// unset($this->list["active"][$entryKey]);
		array_splice($this->list[$listType], $entryKey, 1);
		$this->saveList();

		return [ "status" => 204 ];
	}

	public function switchItem($listType, $entryKey) {
		$item = $this->getRequestBodyData();
		$error = $this->compareItem($listType, $entryKey, $item);
		if ($error !== null) {
			// Try finding the entry, it might have moved due to a request in between
			$entryKey = $this->findItem($listType, $item);
			if ($entryKey === false) {
				return $error;
			}
		}

		$originalItem = $this->list[$listType][$entryKey];
		$originalItem["changed"] = time() * 1000;

		if ($listType === "active") {
			// Deactivate
			array_push($this->list["inactive"], $originalItem);
			array_splice($this->list["active"], $entryKey, 1);
		} else {
			// Activate
			array_push($this->list["active"], $originalItem);
			array_splice($this->list["inactive"], $entryKey, 1);
		}
		$this->saveList();

		return [ "status" => 204 ];
	}

	public function editItem($listType, $entryKey) {
		$items = $this->getRequestBodyData();

		$error = $this->verifyEntry($items["old"]);
		if ($error !== null) {
			return $error;
		}

		$error = $this->verifyEntry($items["new"]);
		if ($error !== null) {
			return $error;
		}

		$error = $this->compareItem($listType, $entryKey, $items["old"]);
		if ($error !== null) {
			// Try finding the entry, it might have moved due to a request in between
			$entryKey = $this->findItem($listType, $items["old"]);
			if ($entryKey === false) {
				return $error;
			}
		}

		$this->list[$listType][$entryKey]["name"] = $items["new"]["name"];
		$this->list[$listType][$entryKey]["category"] = $items["new"]["category"];
		$this->list[$listType][$entryKey]["number"] = $items["new"]["number"];
		$this->list[$listType][$entryKey]["unit"] = $items["new"]["unit"];
		$this->list[$listType][$entryKey]["changed"] = time() * 1000;
		return $this->saveList();
	}

	//////////////////////////////////// Private Methods ////////////////////////////////////

	static private function sortByCategory($a, $b) {
		if ($a["category"] == $b["category"]) {
			return 0;
		}
		return $a["category"] > $b["category"] ? 1 : -1;
	}

	private function saveList() {
		if (!$this->writable) {
			return $this->error(Errors::Storage_Write_Access);
		}

		usort($this->list["active"], ['Shoppinglist', 'sortByCategory']);
		usort($this->list["inactive"], ['Shoppinglist', 'sortByCategory']);
		$this->list["meta"]["changed"] = time() * 1000;

		$ok = file_put_contents($this->listFile, json_encode($this->list), LOCK_EX);
		if ($ok === false) {
			// Error accessing storage file - most likely wrong access code
			return $this->error(Errors::Invalid_ItemStorage_Access);
		}
		return [ "status" => 204 ];
	}

	private function error($error, $details = null) {
		$err = [
			"type" => "error",
			"code" => $error[0],
			"message" => $error[1],
			"status" => $error[2]
		];

		if (!empty($details)) {
			$err["details"] = $details;
		}

		// $err["debug"] = debug_backtrace();

		return $err;
	}

	private function getRequestBodyData($json = true) {
		$body = "";
		$putInput = fopen("php://input", "r");
		while ($data = fread($putInput, 1024)) {
			$body .= $data;
		}
		fclose($putInput);

		if (!$json) {
			return $body;
		}

		try {
			return json_decode($body, true);
		} catch (Exception $ex) {
			return false;
		}

	}
}
