<?php
	include "../../core/bootstrap.php";	
    foreach(glob(__DIR__."/php/*class.php") as $filename) require_once $filename;

	Router::Get('/isLogged',function() {
		Auth::IsLogged();
	});

	Router::Post('/submit',function() {
		$sUsername = @$_POST['username'];
		$sPassword = @$_POST['password'];
		Auth::Login($sUsername,$sPassword);
	});
	
	Router::Post('/logout',function() {
		Auth::Logout();
	});

	Router::Parse();