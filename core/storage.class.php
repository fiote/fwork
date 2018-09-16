<?php
	/**
	* Storage
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class Storage extends xClass {

		public $aList = Array();

		public static function Set($sName,$xValue) {
			$self = self::GetInstance();
			$self->aList[$sName] = $xValue;
		}

		public static function SetArray($sName,$oValues) {
			$self = self::GetInstance();
			foreach($oValues as $sAtr => $xVlr) {
				$self->Set("$sName.$sAtr",$xVlr);
			}
		}

		public static function IfNull($sName,$xValue) {
			$self = self::GetInstance();
			if (!isset($self->aList[$sName])) $self->Set($sName,$xValue);
		}

		public static function Get($sName,$sDefault = null) {
			$self = self::GetInstance();
			return (isset($self->aList[$sName])) ? $self->aList[$sName] : $sDefault;
		}

		public static function GetList() {
			$self = self::GetInstance();
			return $self->aList;			
		}

		public static function GetValue($sName,$sDefault = null) {
			$self = self::GetInstance();
			$sName = str_replace(Array('{','}','$'),'',$sName);
			return $self->Get($sName,$sDefault);
		}
	}