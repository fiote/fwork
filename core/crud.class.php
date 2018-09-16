<?php
	/**
	* Crud
	* 
	* @package    fwork
	* @subpackage Core
	* @author     Murilo Mielke <murilo.eng@gmail.com>
	*/

	class Crud extends xClass {
		public $sTable;

		/**
		* Initiate the crud data
		* @param array $aParams setup data about this crud
		* @return null
		*/	
		function __construct($aParams) {
			$this->sTable = @$aParams['table'];
			$this->sTableAction = ltrim($this->sTable,"vw_");

			// request endpoint
			$this->sEndpoint = @$aParams['endpoint'];
			if (!$this->sEndpoint) $this->sEndpoint = $this->sTable;

			// PK/FK
			$this->sMainKey = @$aParams['mainkey'];
			if (!$this->sMainKey) $this->sMainKey = 'id';

			// table ordering
			$this->sDefaultOrder = @$aParams['order'];
			if (!$this->sDefaultOrder) $this->sDefaultOrder = "$this->sTable.$this->sMainKey";

			// table ordering direction
			$this->sDefaultDirection = @$aParams['direction'];
			if (!$this->sDefaultDirection) $this->sDefaultDirection = 'asc';

			// list of joins
			$this->aJoins = @$aParams['joins'];

			// list of children (selects per child)
			$this->aChildren = @$aParams['children'];
			if (!$this->aChildren) $this->aChildren = [];

			// list of sublists (parts of the full list, based on a field)
			$this->aSubLists = @$aParams['sublists'];
			if (!$this->aSubLists) $this->aSubLists = [];

			// request filtering
			$aFilters = @$aParams['filters'];
			if (!$aFilters) $aFilters = [];
			$this->aEnabledFilters = [];
			
			foreach($aFilters as $sFilter) {
				$aParts = explode(':',$sFilter);
				$sField = @$aParts[0];
				$sType = @$aParts[1];
				if ($sField && $sType) $this->aEnabledFilters[$sField] = $sType;
			}

			// events
			$this->beforeUpdate = @$aParams['beforeUpdate'];
			$this->beforeInsert = @$aParams['beforeInsert'];
			$this->beforeDelete = @$aParams['beforeDelete'];

			$this->afterUpdate = @$aParams['afterUpdate'];
			$this->afterInsert = @$aParams['afterInsert'];
			$this->afterDelete = @$aParams['afterDelete'];
		}

		/**
		* Setup all the main routes for this CRUD
		* @return null
		*/		
		public function SetRoutes() {
			// list route
			Router::Get("/{$this->sEndpoint}/list",function() {

				$aFilters = [];
				$aValues = [];

				foreach($_GET as $sField => $sValue) {
					$sType = @$this->aEnabledFilters[$sField];
					if ($sType) {
						$sFilter = "";
						
						if ($sType == 'int') {
							$sValue = (int) $sValue;
							$sFilter = "$this->sTable.$sField = ?";
						}
						
						if ($sType == 'string') {
							$sFilter = "$this->sTable.$sField = ?";
						}

						if ($sFilter) {
							$aFilters[] = $sFilter;
							$aValues[] = $sValue;
						}
					}
				}

				$aRet = $this->GetList(null,null,$aFilters,$aValues);				
				Output::Send($aRet);
			});

			// sublist route
			foreach($this->aSubLists as $sSub) {
				Router::Get("/{$this->sEndpoint}/{".$sSub."}/list",function() use ($sSub) {
					$VALUE = $_GET[$sSub];
					$aFilters = ["$this->sTable.$sSub = ?"];
					$aValues = [$VALUE];
					$aRet = $this->GetList(null,null,$aFilters,$aValues);
					Output::Send($aRet);
				});
			}

			// upsert route
			// if there is an ID defined, this is a UPDATE request. If there is not, then it's an INSERT
			Router::Post("/{$this->sEndpoint}/upsert",function() {
				$ID = (int) @$_POST['id'];
				
				$sAct = ($ID) ? 'update' : 'insert';
				
				if ($ID) {
					$aRetGet = $this->Get($ID);
					if (!$aRetGet['doc']) $sAct = 'insert';
				}

				$aRet = ($sAct == 'update') 
					? $this->Update($ID,$_POST) 
					: $this->Insert($_POST);

				Output::Send($aRet);
			});

			// a simple get request for a single entry
			Router::Get("/{$this->sEndpoint}/get/{id}",function() {
				$ID = (int) $_GET['id'];
				$aRet = $this->Get($ID);
				unset($aRet['list']);
				Output::Send($aRet);
			});

			// a delete request
			Router::Post("/{$this->sEndpoint}/delete",function() {
				$ID = (int) @$_POST['id'];
				$aRet = $this->Delete($ID);
				Output::Send($aRet);
			});
		}

		/**
		* Filters and returns a single row based on its ID
		* @param integer $ID row's ID
		* @return array the output of the action
		*/		
		public function Get($ID) {				
			$aFilters = ["$this->sTable.$this->sMainKey = ?"];
			$aValues = [$ID];
			$aRet = $this->GetList(null,null,$aFilters,$aValues);
			$aRet['doc'] = @$aRet['list'][0];
			return $aRet;
		}

		/**
		* Generate a list of all rows of the database
		* @param string $sOrder the field to order by
		* @param string $sDirection the direction (asc/desc) to order by
		* @param array $aFilter optional list for filtering
		* @param array $aFilter optional list of values for filtering
		* @return array the output of the action
		*/		
		public function GetList($sOrder = null, $sDirection = null, $aFilters = [], $aValues = []) {
			// opens a connection
			$oDb = DB::Connect();

			// processing joins
			$aJoins = [];
			$aFields = [];

			if ($this->aJoins) {
				foreach($this->aJoins as $sTable => $aData) {
					if (is_string($aData)) {
						$aData = [
							'source_table' => $this->sTable,						
							'fields' => $aData,
							'prefix' => 'LEFT'
						];
					}
												
					if (!isset($aData['target_table'])) $aData['target_table'] = $sTable;							
					if (!isset($aData['target_field'])) $aData['target_field'] = 'id';
					if (!isset($aData['source_field'])) $aData['source_field'] = $this->getRelatedKey($aData['target_table']);

					if (!isset($aData['join'])) $aData['join'] = "ON $aData[source_table].$aData[source_field]_id = $aData[target_table].$aData[target_field]";

					$sJoin = "$aData[prefix] JOIN $aData[target_table] $aData[join]";
					$aJoins[] = trim($sJoin);

					if (is_string($aData['fields'])) $aData['fields'] = explode(',',$aData['fields']);
					foreach($aData['fields'] as $sField) $aFields[] = "IFNULL($aData[target_table].$sField,'') as _$aData[source_field]_$sField";
				}
			}

			$sJoins = implode("\n",$aJoins);
			$sFieldsJoins = implode(", ",$aFields);
			if ($sFieldsJoins) $sFieldsJoins = ", $sFieldsJoins";

			// creating wheres
			$aWheres = $aFilters;
			$sWheres = implode(' AND ',$aWheres);
			if ($sWheres) $sWheres = "WHERE $sWheres";

			// creating the query
			if (!$sOrder) $sOrder = $this->sDefaultOrder;
			if (!$sDirection) $sDirection = $this->sDefaultDirection;


			$sTable = $this->sTable;
			$sFieldsTable = "$sTable.*";

			$sGetFields = @$_GET['fields'];
			$aGetFields = ($sGetFields) ? explode(',',str_replace(' ','',$sGetFields)) : null;

			if ($aGetFields) {
				$aFs = $output = array_map(function($sField) use ($sTable) {  return "$sTable.$sField"; },$aGetFields);
				$sFieldsTable = implode(', ',$aFs);
			}

			$sQuery = "
				SELECT {$sFieldsTable} {$sFieldsJoins}
				FROM {$this->sTable}
				{$sJoins}
				{$sWheres}
				ORDER BY $sOrder $sDirection
			";

			// running it 
			$oCon = $oDb->Query($sQuery,$aValues);

			$aFoundIDs = [];


			foreach($oCon['rows'] as $iKey => $aRow) {

				// emptying null fields
				foreach($aRow as $sField => $sValue) if (!$sValue && $sValue != '0') $aRow[$sField] = '';
				$oCon['rows'][$iKey] = $aRow;

				// gathering IDs
				$aFoundIDs[] = $aRow['id'];
			}

			// getting children
			foreach($this->aChildren as $sTable => $aData) {
				if (is_string($aData)) {
					$aData = [
						'fields' => $aData
					];
				}
				if (!isset($aData['target_table'])) $aData['target_table'] = $sTable;

				// making the field value into a string
				if (is_array($aData['fields'])) $aData['fields'] = implode(',',$aData['fields']);
				// getting the key related to this table
				if (!isset($aData['target_field'])) $aData['target_field'] = $this->getRelatedKey($this->sTable).'_id';
				// getting alot of '?' based on the amount of main rows found 
				$sValues = implode(',', array_fill(0, count($aFoundIDs), '?'));

				// querying it
				$sField = $aData['target_field'];

				$sQuery2 = "
					SELECT /*children*/ $sField, $aData[fields]
					FROM $aData[target_table]
					WHERE $sField IN ({$sValues})
					ORDER BY 1
				";

				$sAlias = '_'.$aData['alias'];
				$aRow[$sAlias] = [];

				if ($sValues) {
					$oCon2 = $oDb->Query($sQuery2,$aFoundIDs);

					// getting the children by main id
					$aPerId = [];
					foreach($oCon2['rows'] as $iKey => $aRow) {
						$iField = $aRow[$sField];
						if (!isset($aPerId[$iField])) $aPerId[$iField] = [];
						$aPerId[$iField][] = $aRow;
					}

					if (!isset($aData['alias'])) $aData['alias'] = $sTable;

					// assigning them to the main rows
					foreach($oCon['rows'] as $iKey => $aRow) {
						$iField = $aRow['id'];
						$aSubs = @$aPerId[$iField];
						if (!$aSubs) $aSubs = [];
						$aRow[$sAlias] = $aSubs;
						// setting it back
						$oCon['rows'][$iKey] = $aRow;
					}
				}
			}

			// returning
			return [
				'status' => $oDb->status, 
				'error' => $oDb->sError,
				'list' => $oCon['rows'],
				'query'=> str_replace(["\n","\t"]," ",$oDb->sQuery)
			];
		}

		/**
		* Gets the name of the column that others table use to relate to this one, based on its name
		* @param string $sTable name of related table
		* @return string the name of the column
		*/		

		public function getRelatedKey($sTable) {
			$sTable = str_replace('vw_','',$sTable);


			$iSize = strlen($sTable);
			$s3last = substr($sTable,-3);
			$s2last = substr($sTable,-2);
			$s1last = substr($sTable,-1);

			// if the table ends with 'ies' (categories, deliveries, etc), the reference is y based (category, delivery, etc)
			if ($s3last == 'ies') return substr($sTable,0,$iSize-3).'y';

			// if the table ends with 'es' (classes, etc), the reference is pure based (class, etc)
			if ($s3last == 'ses') return substr($sTable,0,$iSize-2);

			// if the table ends with 's' (visitors, referrals, etc) the reference is without the s (visitor, referral, etc)
			if ($s1last == 's') return substr($sTable,0,$iSize-1);

			// if there is any table with non-plural names, simply return its name
			return $sTable;
		}

		/**
		* Updates an entry in the database
		* @param integer $ID entry identifier
		* @param array $aData data to be updated
		* @return array the output of the action
		*/
		public function Update($ID, $aData) {
			// opens a connection
			$oDb = DB::Connect();
			// if it's defined, let's trigger the event
			if (@$this->beforeUpdate) $aData = call_user_func_array($this->beforeUpdate,[$ID,$aData]);
			// fixing some values
			$aData = $this->FixValues($aData,'update');
			// inserting it
			$oSt = $oDb->Update($this->sTableAction,$aData,$ID);
			// if it's defined, let's trigger the event
			if (@$this->afterUpdate) $aData = call_user_func_array($this->afterUpdate,[$ID,$aData]);
			// returning the output
			return ['status'=>$oDb->status, 'error'=>$oDb->sError, 'table'=>$this->sTable, 'data'=>$aData, 'id'=>$ID, 'query'=>$oSt['query']];
		}

		/**
		* Creates a new entry in the database
		* @param array $aData data to be insert
		* @return array the output of the action
		*/
		public function Insert($aData) {
			// opens a connection
			$oDb = DB::Connect();
			// if it's defined, let's trigger the event
			if (@$this->beforeInsert) $aData = call_user_func_array($this->beforeInsert,[$aData]);
			// fixing some values
			$aData = $this->FixValues($aData,'insert');
			// inserting it
			$oSt = $oDb->Insert($this->sTableAction,$aData);
			$ID = $oSt['insertId'];
			// if it's defined, let's trigger the event
			if (@$this->afterInsert) $aData = call_user_func_array($this->afterInsert,[$ID,$aData]);
			// returning the output
			return ['status' => $oDb->status, 'insertID'=>$ID, 'error' => $oDb->sError];
		}

		/**
		* Deletes an entry from database
		* @param integer $ID entry identifier
		* @return array the output of the action
		*/
		public function Delete($ID) {
			// opens a connection
			$oDb = DB::Connect();
			// if it's defined, let's trigger the event
			if (@$this->beforeDelete) call_user_func_array($this->beforeDelete,[$ID]);
			// inserting it
			$oDb->Delete($this->sTableAction,$ID);
			// if it's defined, let's trigger the event
			if (@$this->afterDelete) call_user_func_array($this->afterDelete,[$ID]);
			// returning the output
			return ['status' => $oDb->status, 'error' => $oDb->sError];
		}

		/**
		* Fix some values based on the DDL
		* @param array $aData data to be fixed
		* @return array the fixed data
		*/
		public function FixValues($aData,$sAction = '') {
			$aDDL = $this->GetDDL();

			foreach($aData as $sField => $sValue) {
				$aParts = explode('_',$sField);
				$sLastPart = array_pop($aParts);
				$isID = ($sLastPart == 'id') ? true : false;
				$aDef = @$aDDL[$sField];
				if ($aDef) {
					$sType = $aDef['type'];
					if ($sType == 'tinyint(1)' || $sType == 'varchar(1)') {
						if ($sValue == 'null') $sValue = null;
					}
					if ($sType == 'tinyint(1)') {						
						if ($sValue === true || $sValue == 'true') $sValue = 1;
						if ($sValue === false || $sValue == 'false') $sValue = 0;
					}
					if ($sType == 'date') {
						if (!$sValue || $sValue == '0000-00-00') $sValue = null;
					}
					if ($sValue === '') $sValue = null;
				}
				if (!$sValue && $sValue !== '0' && $sValue !== '') $sValue = null;
				if ($sValue == 'null') $sValue = null;
				$aData[$sField] = $sValue;

				if ($sAction == 'update' || $sAction == 'insert') {
					// removing calculated columns
					if ($aDef['extra'] == 'virtual generated') {
						unset($aData[$sField]);
					}

					// removing not-null non-set columns
					if ($aDef['null'] == 'no' && $sValue == null) {
						unset($aData[$sField]);
					}
				}
			}

			return $aData;
		}

		/**
		* Loads the data structure for the table. It's saved on the session (so it can be forceful removed on logout)
		* @return array the data structure
		*/
		public function GetDDL($sTable = null) {
			if (!$sTable) $sTable = $this->sTableAction;

			$sDDL = "DDL_$sTable";
			$aDDL = Session::Get($sDDL);
			if ($aDDL) return $aDDL;

			// opens a connection
			$oDb = DB::Connect();
			// describing the table
			$oCon = $oDb->Query("DESCRIBE $sTable");

			$aDDL = [];

			foreach($oCon['rows'] as $iKey => $aRow) {
				$sKey = $aRow['Field'];
				$aData = [];
				foreach($aRow as $sField => $sValue) {
					$sField = strtolower($sField);
					$sValue = strtolower($sValue);
					$aData[$sField] = $sValue;
				}
				$aDDL[$sKey] = $aData;
			}

			Session::Set($sDDL,$aDDL);
			return $aDDL;
		}

	}