<?php
	/**
	* DB
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class DB extends xClass {

		public $oConfigs = Array();
		public $oConnections = Array();

		public static function AddConfig($sName,$oConfig) {	
			$self = self::GetInstance();
			if (!isset($oConfig['port'])) $oConfig['port'] = '';
			if (!isset($oConfig['username'])) $oConfig['username'] = 'root';
			if (!isset($oConfig['password'])) $oConfig['password'] = '';
			$self->oConfigs[$sName] = $oConfig;
		}

		public static function Connect($sName = 'main') {
			$self = self::GetInstance();
			$self->oCon = @$self->oConnections[$sName];

			if (!$self->oCon) {
				$oConfig = $self->oConfigs[$sName];
				try {
					$oCon = new PDO(
						"mysql:host=$oConfig[sitehost];dbname=$oConfig[database];charset=utf8;$oConfig[port]", 
						$oConfig['username'], 
						$oConfig['password'],
						@$oConfig['options']
					);				
				} catch(Exception $e) {
					Output::Error($e->getMessage());
				}
				$self->oConnections[$sName] = $oCon;
				$self->oCon = $oCon;
			}

			return $self;
		}

		public function Update($sTable,$aData,$aFilter,$bUpsert = false) {
			$aUpdates = [];
			$aParams = [];

			foreach($aData as $sKey => $sVlr) {
				$aUpdates[] = "`$sKey` = ?";
				$aParams[] = $sVlr;
			}

			$aWheres = [];

			if (is_numeric($aFilter)) $aFilter = ['id'=>$aFilter];

			foreach($aFilter as $sKey => $sVlr) {
				$aWheres[] = "`$sKey` = ?";
				$aParams[] = $sVlr;
			}

			$sUpdates = implode(', ',$aUpdates);
			$sWheres = implode(' AND ',$aWheres);
			if (!$sWheres) $sWheres = '1';

			$sQuery = "UPDATE $sTable SET $sUpdates WHERE $sWheres";

			$oSt = $this->Query($sQuery,$aParams);
			$sError = $oSt['error'][2];
			if ($sError) debug($sError);

			// if this updated nothing and bUsert is set
			if ($oSt['affectedRows'] == 0 && $bUpsert) {
				// let's add the filter to the data
				foreach($aFilter as $sField => $sValue) {
					$aData[$sField] = $sValue;					
				}
				// and then actually insert it
				return $this->Insert($sTable,$aData);
			}

			return $oSt;
		}

		public function Delete($sTable,$aFilter,$iLimit = null) {
			$aParams = [];
			$aWheres = [];

			if (is_numeric($aFilter)) $aFilter = ['id'=>$aFilter];

			foreach($aFilter as $sKey => $sVlr) {
				$aWheres[] = "`$sKey` = ?";
				$aParams[] = $sVlr;
			}

			$sWheres = implode(' AND ',$aWheres);
			if (!$sWheres) $sWheres = '1';

			$sLimit = '';
			if ($iLimit) {
				$iLimit = (int) $iLimit;
				$sLimit = "LIMIT $iLimit";
			}

			$sQuery = "DELETE FROM $sTable WHERE $sWheres $sLimit";
			return $this->Query($sQuery,$aParams);
		}

		public function Select($sTable,$sFields,$aFilter)  {
			$aWheres = [];
			$aParams = [];

			foreach($aFilter as $sKey => $xVlr) {
				if (is_array($xVlr)) {					
					$aVals = [];
					foreach($xVlr as $sVlr) {
						$aVals[] = '?';
						$aParams[] = $sVlr;
					}
					$sVals = implode(', ',$aVals);
					$aWheres[] = "`$sKey` IN ($sVals)";
				} else {
					$aWheres[] = "`$sKey` = ?";
					$aParams[] = $xVlr;
				}
			}

			$sWheres = implode(' AND ',$aWheres);
			if (!$sWheres) $sWheres = '1';			

			$sQuery = "SELECT `$sFields` FROM `$sTable` WHERE $sWheres";
			return $this->Query($sQuery,$aParams);
		}

		public function Insert($sTable,$aData) {
			$aColumns = [];
			$aValues = [];
			$aParams = [];

			foreach($aData as $sKey => $sVlr) {
				$aColumns[] = "`$sKey`";
				$aValues[] = "?";
				$aParams[] = $sVlr;
			}

			$sColumns = implode(', ',$aColumns);
			$sValues = implode(', ',$aValues);

			$sQuery = "INSERT INTO `$sTable` ($sColumns) VALUES ($sValues)";
			return $this->Query($sQuery,$aParams);
		}

		public function Query($sQuery,$aParams = Array()) {				
			if (!is_array($aParams)) $aParams = Array($aParams);

			$aRet = Array();					

			$oCon = $this->oCon;

			$oQuery = $oCon->prepare($sQuery);
			$oQuery->execute($aParams);		

			$aRet['query'] = $sQuery;
			$aRet['params'] = $aParams;
			$aRet['error'] = $oQuery->errorInfo();		
						
			$aRet['affectedRows'] = $oQuery->rowCount();

			$aRet['insertId'] = $oCon->lastInsertId(); 
			$aRet['insertID'] = $aRet['insertId'];
			$aRet['status'] = ($aRet['error'][0] && $aRet['error'][0] != '00000') ? false : true;

			$aRet['rows'] = $oQuery->fetchAll(PDO::FETCH_ASSOC);
			$aRet['count'] = count($aRet['rows']);		

			$aRet['found'] = 0;

			if (strpos($sQuery,'SQL_CALC_FOUND_ROWS') !== false) {
				$oFound =  $oCon->query('SELECT FOUND_ROWS()');
				$aFetch = $oFound->fetchAll();
				$aResult = $aFetch[0];
				$aRet['found'] = $aResult[0];
			}

			$this->aData = $aRet['rows'];
			$this->status = $aRet['status'];
			$this->aError = $aRet['error'];
			$this->sError = $aRet['error'][2];
			$this->sQuery = $sQuery;

			return $aRet;
		}
	}



