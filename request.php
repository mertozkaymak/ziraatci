<?php

	define('CONFIG', true);
	header('Access-Control-Allow-Origin: *'); 
	header("Content-Type: text/html; charset=utf-8");
	

	if(!isset($_POST["action"]) || !is_numeric($_POST["action"])) {
		exit();
	}

	require_once __DIR__ . '/config.php';
	require_once __DIR__ . '/classes/db.class.php';
	require_once __DIR__ . '/classes/idea.class.php';
	require_once __DIR__ . '/classes/controller.class.php';
	require_once 'excel/PHPExcel.php';
    require_once 'excel/PHPExcel/IOFactory.php';

	$action = $_POST["action"];
	$controller = new controller($cfg);

	if($action == 1) {
		echo json_encode($controller->getDistricts());
	}

	if($action == 2) {
		$selectedShippingAddress = json_decode($_POST["selectedShippingAddress"], true);
		$province =  mb_strtoupper($selectedShippingAddress["province"],'UTF-8');
		$county =  mb_strtoupper($selectedShippingAddress["county"],'UTF-8');
		$district = mb_strtoupper($selectedShippingAddress["district"],'UTF-8');
		echo json_encode($controller->checkAddress($province, $county, $district));
	}
?>