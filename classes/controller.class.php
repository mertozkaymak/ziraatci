<?php
class controller extends idea {

    public function __construct($cfg) {
        parent::__construct($cfg);
    }

    public function __destruct() {
        parent::__destruct();
    }

	public function doFlush() {
		if (!headers_sent()) {
			ini_set('zlib.output_compression', 0);			
			header('Content-Encoding: none');
		}
		echo str_pad('', 4 * 1024);
		do {
			$flushed = @ob_end_flush();
		} while ($flushed);
		@ob_flush();
		flush();
	}

	public function prepareExcelUpdate($value) {
		if($value == 0) {
			$stmt = $this->db->prepare("UPDATE excel SET updated = 0");
			$stmt->execute();
		}
		else {
			$stmt = $this->db->prepare("DELETE FROM excel WHERE updated = 0");
			$stmt->execute();
		}
	}

	public function getDistricts() {
		$stmt = $this->db->prepare("SELECT district, district_id, (SELECT province FROM provinces WHERE province_id = districts.province_id) AS province, (SELECT county FROM counties WHERE county_id = districts.county_id) AS county FROM districts ORDER by province ASC, county ASC, district ASC");
		$stmt->execute();
		$data =  $stmt->fetchAll();
		$districts = array();
		foreach($data as $d) {
			if(!isset($districts[$d["province"]])) {
				$districts[$d["province"]] = array();
			}
			if(!isset($districts[$d["province"]][$d["county"]])) {
				$districts[$d["province"]][$d["county"]] = array();
			}
			array_push($districts[$d["province"]][$d["county"]], ["district" => $d["district"], "id" => $d["district_id"]]);
		}
		return $districts;
	}

	public function saveExcelToDb($excel) {
		$stmt = $this->db->prepare("SELECT id FROM excel WHERE il=? AND ilce=? AND semt=?");
		$stmt->execute(array($excel["İl"], $excel["İlçe"], $excel["Semt"]));
		$result = $stmt->fetchAll();
		if(count($result) > 0){
			$stmt2 = $this->db->prepare("UPDATE excel SET teslimat=?, min=?, max=?, indirmehizmeti=?, indirmeucreti=?, ozelnakliye=?, updated=1 WHERE il=? AND ilce=? AND semt=?");
			$stmt2->execute(array($excel["Teslimat"], $excel["Min"], $excel["Max"], $excel["İndirmeHizmeti"], $excel["İndirmeÜcreti"], $excel["ÖzelNakliye"], $excel["İl"], $excel["İlçe"], $excel["Semt"]));
			echo $excel["İl"] . " -> " . $excel["İlçe"] . " -> " . $excel["Semt"] . " | has updated!<br>";
		}else{
			$stmt2 = $this->db->prepare("INSERT INTO excel(il, ilce, semt, teslimat, min, max, indirmehizmeti, indirmeucreti, ozelnakliye) VALUES(?,?,?,?,?,?,?,?,?)");
			$stmt2->execute(array($excel["İl"], $excel["İlçe"], $excel["Semt"], $excel["Teslimat"], $excel["Min"], $excel["Max"], $excel["İndirmeHizmeti"], $excel["İndirmeÜcreti"], $excel["ÖzelNakliye"]));
			echo $excel["İl"] . " -> " . $excel["İlçe"] . " -> " . $excel["Semt"] . " | has inserted!<br>";
		}
		$this->doFlush();
	}

	public function checkAddress($province, $county, $district) {
		$stmt = $this->db->prepare("SELECT * FROM excel WHERE il=? AND ilce=? AND semt=?");
		$stmt->execute(array($province, $county, $district));
		$result = $stmt->fetchAll(PDO::FETCH_ASSOC);
		if(count($result) > 0){
			return array(
				"İl" => $result[0]["il"],
				"İlçe" => $result[0]["ilce"],
				"Semt" => $result[0]["semt"],
				"Teslimat" => $result[0]["teslimat"],
				"Min" => $result[0]["min"],
				"Max" => $result[0]["max"],
				"İndirmeHizmeti" => $result[0]["indirmehizmeti"],
				"İndirmeÜcreti" => $result[0]["indirmeucreti"],
				"ÖzelNakliye" => $result[0]["ozelnakliye"]
			);
		}else{
			return array();
		}
	}

}
?>