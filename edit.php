<?php

    header('Content-disposition: attachment; filename=file.json');
    header('Content-type: application/json');

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_URL, 'https://dev.digitalfikirler.com/ziraatci/district.json');
    $result = curl_exec($ch);
    curl_close($ch);
    
    $obj = json_decode($result);
    
    $counter = 0;
    foreach ($obj as $value) {
        if($counter > 3){
            $value->Min = 0;
            $value->Max = -1;
            $value->İndirmeHizmeti = 1;
            $value->İndirmeÜcreti = 0;
            $value->ÖzelNakliye = 90;
        }
        $counter++;
    }

    echo "<pre>";
    echo json_encode($obj, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    echo "</pre>";

    $fp = fopen('results.json', 'w');
    fwrite($fp, json_encode($obj));
    fclose($fp);

?>