<?php
	/**
	* Session
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	session_start();

	class Session {
		
		public static function Get($sIndex, $xDefault = null) {
			if (isset($_SESSION[$sIndex])) return $_SESSION[$sIndex];
			return $xDefault;
		}

		public static function Set($sIndex, $xValue) {
			$_SESSION[$sIndex] = $xValue;
		}

		public static function Destroy() {
			session_destroy();
		}

	}