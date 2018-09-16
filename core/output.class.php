<?php
	/**
	* Output
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class Output extends xClass {

		public static function Error($sMessage) {
			$aRet = Array('status'=>false, 'error'=>$sMessage);
			Output::Send($aRet);
		}

		public static function ErrorCode($sCode) {
			$aRet = ['status'=>false, 'errorcode'=>$sCode];
			Output::Send($aRet);
		}

		public static function DieCode($iCode,$sMessage = null) {
			http_response_code($iCode);
			die($sMessage);
		}

		public static function Success() {
			$aRet = ['status'=>true];
			Output::Send($aRet);
		}

		public static function SendList($aList) {
			$aRet = ['status'=>true, 'list'=> $aList];
			Output::Send($aRet);
		}

		public static function NotAuthorized() {
			self::Send(['status'=>false, 'error'=>'You are not authorized to see this data.', 'errorcode'=>'not_authorized']);
		}

		public static function Send($aRet) {
			echo json_encode((object) $aRet);
			die();
		}
	}