create schema talk;


drop table if exists talk.account;
create table talk.account (
	account_id serial primary key,
	account_type varchar(255) default 'personal',
	login_id varchar(255) default '' unique,
	login_password varchar(255) default '',
	nick varchar(255) default '',
	email varchar(255) default '',
	phone varchar(255) default '',
	avatar varchar(255) default '',
	create_time timestamp default current_timestamp
);


drop view if exists talk.account_nonsens;
create view talk.account_nonsens as select account_id,login_id,account_type,nick,email,phone,avatar from talk.account;


drop table if exists talk.relation;
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
	talk.account left join slave on talk.account.account_id = slave.master_account_id;

select * from talk.contacts;
select * from talk.relation;
select * from talk.account;


insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 2, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 2, 1, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 3, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 3, 1, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 4, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 5, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 6, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 7, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 8, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 9, 'friend');
insert into talk.relation(relation_type ,master_account_id ,slave_account_id ,relation_identity ) values ('one-one', 1, 10, 'friend');