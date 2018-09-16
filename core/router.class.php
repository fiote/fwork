<?php
	/**
	* Router
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class Router extends xClass { 		

		public $aRoutes = [], $aParts = [];
		public $sURL = '', $sMethod = '';

		public function __construct() {
			$basepath = implode('/', array_slice(explode('/', $_SERVER['SCRIPT_NAME']), 0, -1)) . '/';
			$uri = substr($_SERVER['REQUEST_URI'], strlen($basepath));
			if (strstr($uri, '?')) $uri = substr($uri, 0, strpos($uri, '?'));
			$this->sURL = '/' . trim($uri, '/');

			$this->sMethod = $_SERVER['REQUEST_METHOD'];

    		$aPts = explode('/',$this->sURL);
    		foreach($aPts as $sPart) if ($sPart) array_push($this->aParts,$sPart);
		}

		public static function Http($path,$filepath) {
			self::add('GET',$path,$filepath);			
		}

		public static function Get($path,$callback) {
			self::add('GET',$path,$callback);
		}

		public static function Post($path,$callback) {
			self::add('POST',$path,$callback);
		}

		public static function Group($base,$class) {			
			self::add('GET',"$base","$class::Display");
			
			self::add('GET',"$base/insert","$class::DisplayInsert");
			self::add('POST',"$base/insert","$class::SubmitInsert");
			
			self::add('GET',"$base/edit/{id}","$class::DisplayEdit");
			self::add('POST',"$base/edit/{id}","$class::SubmitEdit");

			self::add('GET',"$base/clone/{id}","$class::DisplayClone");

			self::add('POST',"$base/delete/{id}","$class::SubmitDelete");
			
			self::add('GET',"$base/{id}","$class::Display");
		}

		public static function Add($method,$path,$callback) {
			$self = self::GetInstance();
			if (!@$self->aRoutes[$method]) $self->aRoutes[$method] = Array();
			$self->aRoutes[$method][] = [$path,$callback];
		}

		public static function slugify($sString) { 
			$sString = preg_replace('~[^\pL\d]+~u', '-', $sString);
			$sString = iconv('utf-8', 'us-ascii//TRANSLIT', $sString);
			$sString = preg_replace('~[^-\w]+~', '', $sString);
			$sString = trim($sString, '-');
			$sString = preg_replace('~-+~', '-', $sString);
			$sString = strtolower($sString);
			if (empty($sString)) return 'n-a';
			return $sString;
		}

		public static function Redirect($sPath,$sMethod = '') {
			$self = self::GetInstance();
			if ($sMethod) $self->sMethod = $sMethod;
			$self->sURL = $sPath;
			Header("Location:$sPath");
			die();
		}

		public static function Parse() {
			if (DEBUG) debug("Router::Parse");
			$self = self::GetInstance();
			// sorting the actual url
			Storage::Set('page.url',$self->sURL);
			// checking if there is a list of routes for this method
			$aList = @$self->aRoutes[$self->sMethod];

			if (DEBUG) debug("URL: {$self->sURL}");
			if (DEBUG) debug($aList);

			if ($aList) {
				// iterating all routes on the list
				foreach($aList as $aItem)  {
					$sRule = str_replace("/","\/",$aItem[0]);

					$sRegex = '/\{([^\}]+)\}/';
					preg_match_all($sRegex, $sRule, $aMatches);

					$aParams = Array();
					$aValues = Array();

					foreach($aMatches[0] as $iKey => $sMatch) {
						$sRule = str_replace($sMatch,'([^\/]*)',$sRule);
						$aParams[] = $aMatches[1][$iKey];
					}

					$sRule = '/^'.$sRule.'$/';
					preg_match($sRule, $self->sURL, $aMatches);
					
					if (count($aMatches)) {

						array_shift($aMatches);
						foreach($aMatches as $iKey => $xValue) {
							$sParam = $aParams[$iKey];
							$_GET[$sParam] = $xValue;
						}

						$sCall = $aItem[1];

						// if the callback is an HTML file, just serve it
						if (is_string($sCall) && strpos($sCall,'.html') !== false) {
							include $sCall;
							die();
						}

						// if the callback is actually a function, just call it
						if (!is_string($sCall) && is_callable($sCall)) {
							$sCall();
							die();
						}

						// otherside, let's call it by a string
						call_user_func_array($sCall,$aMatches);
					}
				}
			}

			Output::DieCode(501);
		}

	}
?>