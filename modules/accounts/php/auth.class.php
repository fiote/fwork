<?php
	include_once "../../core/bootstrap.php";

	/**
	* Auth
	* 
	* @package    Topsaz
	* @subpackage Accounts
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class Auth {

		/**
		* Checks if the user is logged in the current session
		* @return null
		*/
		public static function IsLogged() {			
			$aRet = [];
			$aRet['logged'] = Session::Get('isLogged');
			Output::Send($aRet);
		}

		/**
		* Tries to login the user with the posted username/password 
		* @param string $sUsername
		* @param string $sPassword
		* @return null
		*/
		public static function Login($sUsername,$sPassword) {
			// check if the data is present
			if (!$sUsername) Output::Error('Please inform your username.');
			if (!$sPassword) Output::Error('Please inform your password.');

			// loading up the user
			$oUser = new User();
			$oUser->Get($sUsername);

			if (!$oUser->data) {
				Output::Error('Invalid username.');
			}

			// checking its password
			if ($oUser->Verify($sPassword)) {
				// marking it as logged
				Session::Set('isLogged',true);
				Session::Set('LoggedUser',$oUser->data);
				$oUser->Login();
				// and returning the success
				Output::Success();
			}

			// otherside, let's warn the user
			Output::Error('Invalid username/password.');
		}

		/**
		* Logging out the user
		* @return null
		*/
		public static function Logout() {
			$oUser = new User();
			$aData = Session::Get('LoggedUser');
			$oUser->Set($aData);

			Session::Set('isLogged',false);
			Session::Set('LoggedUser',null);
			Session::Destroy();
			
			$oUser->Logout();
			Output::Success();
		}

	}
