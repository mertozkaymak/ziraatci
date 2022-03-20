<?php
	define('CONFIG', true);
	header('Access-Control-Allow-Origin: *'); 
	header("Content-Type: text/html; charset=utf-8");
	
	require_once __DIR__ . '/config.php';
	require_once __DIR__ . '/classes/db.class.php';
	require_once __DIR__ . '/classes/idea.class.php';
	require_once __DIR__ . '/classes/controller.class.php';
	require_once 'excel/PHPExcel.php';
    require_once 'excel/PHPExcel/IOFactory.php';

	$controller = new controller($cfg);
	$controller->prepareExcelUpdate(0);

	$filename = mt_rand(111111,666666);
	file_put_contents(__DIR__ . '/' . $filename . '.xlsx',file_get_contents('http://yemsiparis.mnv.com.tr/kontrol.xlsx'));
	$inputFileName = __DIR__ . "/" . $filename . ".xlsx";

	$inputFileType = PHPExcel_IOFactory::identify($inputFileName);
	$objReader = PHPExcel_IOFactory::createReader($inputFileType);
	$objPHPExcel = $objReader->load($inputFileName);

	$sheet = $objPHPExcel->getSheet(0); 
	$highestRow = $sheet->getHighestRow(); 
	$highestColumn = $sheet->getHighestColumn();
	$excel = array();

	for ($row = 2; $row <= $highestRow; $row++){

		$rowData = $sheet->rangeToArray('A' . $row . ':' . $highestColumn . $row, NULL, TRUE, FALSE);
		$controller->saveExcelToDb(array(
			"İl" => $rowData[0][0],
			"İlçe" => $rowData[0][1],
			"Semt" => $rowData[0][2],
			"Teslimat" => $rowData[0][3],
			"Min" => $rowData[0][4],
			"Max" => $rowData[0][5],
			"İndirmeHizmeti" => $rowData[0][6],
			"İndirmeÜcreti" => $rowData[0][7],
			"ÖzelNakliye" => $rowData[0][8]
		));
	}
	
	$controller->prepareExcelUpdate(1);
	unlink(__DIR__ . "/" . $filename . ".xlsx");
?>