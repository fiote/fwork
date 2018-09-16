<?php
	include_once "../../core/bootstrap.php";

	/**
	* User
	* 
	* @package    Topsaz
	* @subpackage Accounts
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class User {

		public $data = [];

		/**
		* Loads up the user data by the username
		* @param string $sUsername
		* @return array
		*/		
		public function Get($sUsername) {			
			// opens a connection
			$oDb = DB::Connect();
			// searches for the user by its username
			$oCon = $oDb->Query("
				SELECT *
				FROM accounts 
				WHERE username = ?
				LIMIT 1
			",[$sUsername]);
			// store it
			$this->data = @$oCon['rows'][0];
			// and return it
			return $this->data;
		}

		/**
		* Setting up the user's data
		* @param array $aData
		* @return array
		*/	

		public function Set($aData) {
			$this->data = $aData;
		}

		/**
		* Loads up the user data
		* @param string $sPassword
		* @return boolean
		*/
		public function Verify($sPassword) {
			// if the user was not loaded yet, we can't do anthing
			if (!$this->data) return;
			// verifying the password hash
			return password_verify($sPassword,$this->data['password']);
		}

		/**
		* Script that runs when an user successfully logs in
		* @return null
		*/
		public function Login() {			
			// if the user was not loaded yet, we can't do anthing
			if (!$this->data) return;
			// opens a connection
			$oDb = DB::Connect();	
			// updating the last login date
			$oDb->Query('UPDATE accounts SET last_login = NOW() WHERE id = ?',$this->data['id']);
		}

		/**
		* Script that runs when an user requests a logout
		* @return null
		*/
		public function Logout() {			
			// if the user was not loaded yet, we can't do anthing
			if (!$this->data) return;
		}
	}