<?php
class db {

    public $db;

    protected function connect($db_name, $db_user, $db_password) {

        try{

            $this->db = new PDO("mysql:host=localhost;dbname=" . $db_name, $db_user, $db_password, array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8",
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ));
        }
        catch(PDOException $ex) {
            die("No database connection");
        }

    }

    protected function disconnect() {

        $this->db = NULL;

    }

}
?>