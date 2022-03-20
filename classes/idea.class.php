<?php
class idea extends db {

    protected $cfg;
    private $counter = 1;
	private $total = 0;
	private $refresh_token;
	private $access_token;
        
    public function __construct($cfg) {
        
        $this->cfg = $cfg;
        parent::connect($cfg["db_name"], $cfg["db_user"], $cfg["db_password"]);
        
    }

    public function __destruct() {

        parent::disconnect();

    }

    // Ideasoft API bağlantı kontrolü
	
	public function checkStatus() {
	
		$stmt = $this->db->prepare("SELECT access_token, refresh_token FROM ideasoft WHERE access_token IS NOT NULL AND refresh_token IS NOT NULL LIMIT 1");
		$stmt->execute();
		$result = $stmt->fetch();
		
		if(!$result) {
            return $this->cfg["api_access"];									
		}
		else {		
			$this->access_token = $result["access_token"];
			$this->refresh_token = $result["refresh_token"];			
			return 1;		
		}
	
	}

	public function firstAccess($code) {
			
		$fields = array('grant_type'=>'authorization_code','client_id' => $this->cfg["client_id"],'client_secret'=>$this->cfg["client_secret"],'code'=>$code,'redirect_uri'=>$this->cfg["redirect_uri"]);
		$postvars = $this->createPostvars($fields);
		
		$response = $this->callAPI("POST", "/oauth/v2/token", $postvars);
		
		return $this->updateToken($response);
	
	}

	public function refreshToken() {
	
		$fields = array( 'grant_type'=>'refresh_token','client_id'=>$this->cfg["client_id"],'client_secret'=>$this->cfg["client_secret"],'refresh_token'=>$this->refresh_token);
		$postvars = $this->createPostvars($fields);
		
		$response = $this->callAPI("POST", "/oauth/v2/token", $postvars);
		
		if(isset($response["access_token"])) {
		
			return $this->updateToken($response);
			
		}
		else {
			
			sleep(1);
			$this->refreshToken();
			
		}
	
	}

	public function getIdeaProducts() {
	
		$page = 1;
		$stop = 0;
		
		$ideaproducts = array();
		$counter = -1;

		while($stop == 0) {
			
			$products = $this->callApi("GET", "/api/products?limit=100&page=" . $page);
	
			if($products == 0) {

				sleep(1);
				
			}
			else if($products == 1) {

				sleep(5);
				
			}
			else {
				
				if($this->total == 0) {
					$stop = 1;
					break;
				}
				
				for($i = 0; $i < count($products); $i++) {
					$counter++;
					$ideaproducts[$counter] = $products[$i];
				}
				
				$page++;
				sleep(1);
				
			}
			
			if($this->total != 0 && $this->total < $page) {
				$this->total = 0;
				$this->counter = 1;
				$stop = 1;
			}
			
		}
		
		return $ideaproducts;
	
	}
	
	private function createPostvars($fields) {
	
		$postvars = '';
		
		foreach($fields as $key=>$value) {
			$postvars .= $key . "=" . $value . "&";
		}
		
		$postvars = rtrim($postvars, '&');
		
		return $postvars;
	
	}

	private function updateToken($response) {
	
		$stmt = $this->db->prepare("UPDATE ideasoft SET access_token = ?, refresh_token = ? WHERE id = 1");
	
		if($stmt->execute([$response["access_token"], $response["refresh_token"]])) {
			
			$this->access_token = $response["access_token"];
			$this->refresh_token = $response["refresh_token"];
			
			return 1;
			
		}
		else {
		
			return 0;
		
		}
	
	}

	public function getIdeaProductBySku($sku) {
		
		$product = $this->callApi("GET", "/api/products?sku=" . $sku);
		if(isset($product[0])) {
			return $product[0];
		}
		else return 0;
		
	}

	public function updateIdeaProduct($product) {
	
		return $this->callApi("PUT", "/api/products/" . $product["id"], json_encode($product));
	
	}

	public function getIdeaOrderById($id) {
		
		$order = $this->callApi("GET", "/api/orders?ids=" . $id);
		if(isset($order[0])) {
			return $order[0];
		}
		else return 0;
		
	}

	public function getIdeaCustomerById($id) {
		
		$customer = $this->callApi("GET", "/api/members?ids=" . $id);
		if(isset($customer[0])) {
			return $customer[0];
		}
		else return 0;
		
	}

	public function getIdeaOrderByTransactionId($id) {

		$order = $this->callApi("GET", "/api/orders?transactionId=" . $id);
		if(isset($order[0])) {
			return $order[0];
		}
		else return 0;
		
	}

	public function updateIdeaOrder($order) {
	
		return $this->callApi("PUT", "/api/orders/" . $order["id"], json_encode($order));
	
	}

	public function deleteIdeaOrder($order) {
	
		return $this->callApi("DELETE", "/api/orders/" . $order["id"]);
	
	}

	public function addIdeaOrder($order) {
	
		return $this->callApi("POST", "/api/orders", json_encode($order));
	
	}

	public function updateIdeaCustomer($customer) {
	
		return $this->callApi("PUT", "/api/members/" . $customer["id"], json_encode($customer));
	
	}

	public function getIdeaOrders() {
		
		$orders = $this->callApi("GET", "/api/orders?limit=100");		
		return $orders;
		
	}

    public function callAPI($method, $url, $data = "") {

	    $curl = curl_init();

	    switch ($method) {
		  
			case "GET":
				break;
			
			case "POST":
		  
				curl_setopt($curl, CURLOPT_POST, 1);
			
				if ($data) {
					curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
				}
			
				break;
		  
			case "PUT":
		  
				curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "PUT");
			
				if ($data) {
					curl_setopt($curl, CURLOPT_POSTFIELDS, $data);	
				}
			
				break;
			
			case "DELETE":
		  
				curl_setopt($curl, CURLOPT_CUSTOMREQUEST, "DELETE");					
				break;

		}

		curl_setopt($curl, CURLOPT_URL, $this->cfg["url"] . $url);
		curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
		
		if($method != "POST" && $url != "/oauth/v2/token") {
			curl_setopt($curl, CURLOPT_HEADER, 1);
		}
		
		if(strpos($url, 'token') === false) {
			
			curl_setopt($curl, CURLOPT_HTTPHEADER, array(
			  'Authorization: Bearer ' . $this->access_token,
			  'Content-Type: application/json'
			));
			  
			curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
			
		}

		$result = curl_exec($curl);

        // echo $result . "<br><br>";
		
		if($method != "POST" && $method != 'DELETE' && $url != "/oauth/v2/token" && strpos($result, "mode=block") !== false) {
			
			$content = explode("mode=block", $result);
			$header = trim($content[0]) . "mode=block";			
			$content = trim($content[1]);
			
			if($this->total == 0) {
				$total2 = explode("total_count: ", $header);
				if(count($total2) > 0) {
					$total2 = explode(" ", $total2[1]);
					$this->total = ceil((float)$total2[0] / 100);	
				}
			}

			if(strpos($header, "504") !== false) {
				return 0;
			}
			
			if(strpos($header, "429") !== false) {
				return 1;
			}
			
			$this->counter++;

			curl_close($curl);
		   
			return json_decode($content, true);
			
		}
		else if($method == 'DELETE') {
			
			if(strpos($result, '204') !== false) {
				return true;
			}
			else {
				return false;
			}
			
		}
		else {
		
			curl_close($curl);
			
			return json_decode($result, true);
		
		}
					   
	}

}
?>