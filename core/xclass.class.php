<?php
	/**
	* xClass
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class xClass {
		public static function GetInstance($caller = '') {      		
			$trace = debug_backtrace();
			if (!$caller) $caller = $trace[1]['class'];
			if (!isset($GLOBALS[$caller])) {
				if (DEBUG) debug("xClass::GetInstance ($caller)");
				$GLOBALS[$caller] = new $caller;
			}
			return $GLOBALS[$caller];
		}
	}
