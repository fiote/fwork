<?php
    /**
    * Crud
    * 
    * @package    fwork
    * @subpackage Core
    * @author     Murilo Mielke <murilo.eng@gmail.com>
    */

    // ===================================================
    // MISC
    // ===================================================

    if (!DEFINED('DEBUG')) DEFINE('DEBUG',false);

    spl_autoload_register(function ($sName) {
        $sFlat = "php/".strtolower($sName).".class.php";
        if (file_exists($sFlat)) require_once $sFlat;
        $sDash = "php/".camel2dashed($sName).".class.php";
        if (file_exists($sDash)) require_once $sDash;
    });

    function debug($obj,$return = false) {
        $dbg = "<pre>".print_r($obj,true)."</pre>";
        if ($return) return $dbg;
        echo $dbg;
    }

    function camel2dashed($className) {
        return strtolower(preg_replace('/([a-zA-Z])(?=[A-Z])/', '$1-', $className));
    }

    function getInstanceName($className) {
        return ucfirst($className);
    }

    // ===================================================
    // REQUIRES
    // ===================================================

    require_once __DIR__."/xclass.class.php";
    foreach(glob(__DIR__."/*class.php") as $filename) require_once $filename;

    // ===================================================
    // CONFIGS
    // ===================================================

    foreach(glob(__DIR__."/../config/*.php") as $filename) require_once $filename;