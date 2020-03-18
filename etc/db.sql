
drop table if exists talk.account cascade;
create table talk.account (
	account_id serial primary key,
	account_type varchar(255) default 'personal',
	login_id varchar(255) default '' unique,
	login_password varchar(255) default '',
	nick varchar(255) default '',
	email varchar(255) default '',
	phone varchar(255) default '',
	avatar varchar(255) default '',
	question1 varchar(255) default '',
	question2 varchar(255) default '',
	question3 varchar(255) default '',
	answer1 varchar(255) default '',
	answer2 varchar(255) default '',
	answer3 varchar(255) default '',
	create_time timestamp default current_timestamp
);


drop view if exists talk.account_nonsens;
create view talk.account_nonsens as select account_id,login_id,account_type,nick,email,phone,avatar from talk.account;


drop table if exists talk.relation cascade;
create table talk.relation (
	relation_id serial primary key,
	relation_type varchar(255) default '',
	master_account_id bigint default 0,
	slave_account_id bigint default 0,
	relation_identity varchar(255) default ''
);


drop view if exists talk.contacts;
create view talk.contacts 
		as 
with slave as (
	select 
		talk.relation.master_account_id,
		talk.relation.relation_type,
		talk.relation.relation_identity,
		talk.account.account_type,
		talk.account.login_id,
		talk.account.nick,
		talk.account.email,
		talk.account.phone,
		talk.account.avatar
	from 
		talk.account left join talk.relation on talk.account.account_id = talk.relation.slave_account_id
	where master_account_id is not null
)
select 
	talk.account.account_id as master_account_id,
	slave.account_type,
	slave.login_id,
	slave.nick,
	slave.email,
	slave.phone,
	slave.avatar,
	slave.relation_type,
	slave.relation_identity
from
	talk.account left join slave on talk.account.account_id = slave.master_account_id where slave.login_id is not null;

select * from talk.contacts;
select * from talk.relation;
select * from talk.account;
select * from talk.account_nonsens;

insert into talk.relation(relation_type, master_account_id, slave_account_id, relation_identity) values('one-one', 3, 2, 'friend');
insert into talk.relation(relation_type, master_account_id, slave_account_id, relation_identity) values('one-one', 2, 3, 'friend');
insert into talk.relation(relation_type, master_account_id, slave_account_id, relation_identity) values('one-one', 3, 4, 'friend');
insert into talk.relation(relation_type, master_account_id, slave_account_id, relation_identity) values('one-one', 4, 3, 'friend');