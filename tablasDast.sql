create table scans(scanId int not null, target varchar(500) not null, status varchar(50) not null, primary key (scanId));
create table scansApi(dbId int not null, apiId int not null, foreign key (dbId) references scans(scanId));
create table vulnerabilities(vulnerabilityId int not null AUTO_INCREMENT, description varchar(500), primary key(vulnerabilityId));
create table scansVulnerabilities(scanId int not null, vulnerabilityId int not null, foreign key (scanId) references scans(scanId), foreign key (vulnerabilityId) references vulnerabilities(vulnerabilityId));