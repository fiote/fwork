<?php	
	DB::AddConfig('main',[
		'sitehost'=>'127.0.0.1',
		'database'=>'some_db',
		'username'=>'some_user',
		'password'=>'some_password',
		'options'=>[PDO::MYSQL_ATTR_FOUND_ROWS => true]
	]);
