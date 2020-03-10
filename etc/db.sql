CREATE DATABASE talk;
USE talk;

DROP TABLE IF EXISTS account;
CREATE TABLE account (
    auto_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    login_id VARCHAR(255) DEFAULT '' UNIQUE,
    login_password VARCHAR(255) DEFAULT '',
    email VARCHAR(255) DEFAULT '',
    phone VARCHAR(255) DEFAULT '',
    avatar VARCHAR(255) DEFAULT '',
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modify_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)

DROP TABLE IF EXISTS account_relation;
CREATE TABLE account_relation (
	auto_id BIGINT PRIMARY KEY AUTO_INCREMENT,
	master_login_id VARCHAR(255) NOT NULL,
	slave_login_id VARCHAR(255) NOT NULL,
	relation BIGINT DEFAULT 1,
	create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_modify_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

SELECT * FROM account;
SELECT * FROM account_relation;
DELETE FROM account;
DELETE FROM account_relation;


INSERT INTO account SET login_id = 'maxtorm', login_password = 'lzw981018';

INSERT INTO account_relation SET master_login_id = 'maxtorm', slave_login_id = 'maxtorm12138';
INSERT INTO account_relation SET master_login_id = 'maxtorm12138', slave_login_id = 'maxtorm';

SELECT account.login_id, account.avatar, account.email, account.phone FROM account LEFT JOIN account_relation on account.login_id = account_relation.slave_login_id WHERE account_relation.master_login_id='maxtorm';