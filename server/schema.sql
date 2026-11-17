-- Crane Tea HRM
-- Database schema based on Chapter III of "Báo cáo TTCN b2-3 - v2".
-- MySQL 8.0.16+ recommended (for enforced CHECK constraints).
--
-- The seven ENUM value sets marked "agreed clarification" were approved
-- separately by the project owner because the report names these fields
-- but does not enumerate their permitted values.

CREATE DATABASE IF NOT EXISTS crane_tea_hrm
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE crane_tea_hrm;

-- 1. USERS
CREATE TABLE IF NOT EXISTS USERS (
    user_id INT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('MANAGER', 'EMPLOYEE') NOT NULL,
    -- Agreed clarification: ACTIVE / INACTIVE / LOCKED
    account_status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

-- 2. EMPLOYEES
CREATE TABLE IF NOT EXISTS EMPLOYEES (
    employee_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    date_of_birth DATE,
    employee_type ENUM('PART_TIME', 'FULL_TIME') NOT NULL,
    start_date DATE NOT NULL,
    -- Agreed clarification: ACTIVE / ON_LEAVE / RESIGNED
    employment_status ENUM('ACTIVE', 'ON_LEAVE', 'RESIGNED') NOT NULL DEFAULT 'ACTIVE',
    -- Agreed clarification: NOT_STARTED / IN_PROGRESS / PASSED / FAILED
    probation_status ENUM('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'FAILED')
        NOT NULL DEFAULT 'NOT_STARTED',
    PRIMARY KEY (employee_id),
    UNIQUE KEY uq_employees_user_id (user_id),
    KEY idx_employees_phone (phone),
    CONSTRAINT fk_employees_user
        FOREIGN KEY (user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. AVAILABILITY
CREATE TABLE IF NOT EXISTS AVAILABILITY (
    availability_id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    week_start DATE NOT NULL,
    day_of_week TINYINT NOT NULL,
    start_time TIME,
    end_time TIME,
    is_off BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (availability_id),
    KEY idx_availability_employee_week (employee_id, week_start),
    CONSTRAINT fk_availability_employee
        FOREIGN KEY (employee_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. SHIFTS
CREATE TABLE IF NOT EXISTS SHIFTS (
    shift_id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    -- Agreed clarification: DRAFT / PUBLISHED / CANCELLED
    shift_status ENUM('DRAFT', 'PUBLISHED', 'CANCELLED')
        NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (shift_id),
    KEY idx_shifts_employee_date (employee_id, work_date),
    CONSTRAINT fk_shifts_employee
        FOREIGN KEY (employee_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_shifts_time_order
        CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- 5. ATTENDANCE
CREATE TABLE IF NOT EXISTS ATTENDANCE (
    attendance_id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    shift_id INT NOT NULL,
    check_in DATETIME,
    check_out DATETIME,
    working_minutes INT,
    -- Agreed clarification: VALID / INCOMPLETE / CORRECTED
    attendance_status ENUM('VALID', 'INCOMPLETE', 'CORRECTED')
        NOT NULL DEFAULT 'VALID',
    note TEXT,
    PRIMARY KEY (attendance_id),
    KEY idx_attendance_employee (employee_id),
    KEY idx_attendance_shift (shift_id),
    KEY idx_attendance_employee_checkout (employee_id, check_out),
    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_shift
        FOREIGN KEY (shift_id) REFERENCES SHIFTS(shift_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_attendance_time_order
        CHECK (check_out IS NULL OR check_in IS NULL OR check_out > check_in),
    CONSTRAINT chk_attendance_working_minutes
        CHECK (working_minutes IS NULL OR working_minutes >= 0)
) ENGINE=InnoDB;

-- 6. REQUESTS
CREATE TABLE IF NOT EXISTS REQUESTS (
    request_id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    request_type ENUM('LEAVE', 'OVERTIME', 'ATTENDANCE_CORRECTION') NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    reason TEXT,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    reviewed_by INT NULL,
    reviewed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (request_id),
    KEY idx_requests_employee_status (employee_id, status),
    KEY idx_requests_reviewer (reviewed_by),
    CONSTRAINT fk_requests_employee
        FOREIGN KEY (employee_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_requests_time_order
        CHECK (end_time > start_time),
    CONSTRAINT chk_processed_request_review
        CHECK (
            status = 'PENDING'
            OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
        )
    -- reviewed_by remains an INT without a foreign key because Chapter III
    -- describes it as the reviewer but does not specify its referenced table.
) ENGINE=InnoDB;

-- 7. SHIFT_SWITCHES
CREATE TABLE IF NOT EXISTS SHIFT_SWITCHES (
    switch_id INT NOT NULL AUTO_INCREMENT,
    shift_id INT NOT NULL,
    requester_id INT NOT NULL,
    replacement_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    reason TEXT,
    -- Agreed clarification: PENDING / ACCEPTED / REJECTED / CANCELLED
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')
        NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (switch_id),
    KEY idx_shift_switches_shift (shift_id),
    KEY idx_shift_switches_requester (requester_id),
    KEY idx_shift_switches_replacement (replacement_id),
    CONSTRAINT fk_shift_switches_shift
        FOREIGN KEY (shift_id) REFERENCES SHIFTS(shift_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_shift_switches_requester
        FOREIGN KEY (requester_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_shift_switches_replacement
        FOREIGN KEY (replacement_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_shift_switch_time_order
        CHECK (end_time > start_time)
) ENGINE=InnoDB;

-- 8. PAYROLLS
CREATE TABLE IF NOT EXISTS PAYROLLS (
    payroll_id INT NOT NULL AUTO_INCREMENT,
    employee_id INT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_working_minutes INT NOT NULL DEFAULT 0,
    total_overtime_minutes INT NOT NULL DEFAULT 0,
    gross_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    -- Agreed clarification: DRAFT / FINALIZED / PAID
    payment_status ENUM('DRAFT', 'FINALIZED', 'PAID')
        NOT NULL DEFAULT 'DRAFT',
    PRIMARY KEY (payroll_id),
    UNIQUE KEY uq_payroll_employee_period (employee_id, period_start, period_end),
    CONSTRAINT fk_payrolls_employee
        FOREIGN KEY (employee_id) REFERENCES EMPLOYEES(employee_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_payroll_period
        CHECK (period_end >= period_start),
    CONSTRAINT chk_payroll_minutes
        CHECK (total_working_minutes >= 0 AND total_overtime_minutes >= 0),
    CONSTRAINT chk_payroll_amounts
        CHECK (
            gross_salary >= 0
            AND total_deductions >= 0
            AND net_salary >= 0
        )
) ENGINE=InnoDB;

-- 9. PAYROLL_DETAILS
CREATE TABLE IF NOT EXISTS PAYROLL_DETAILS (
    detail_id INT NOT NULL AUTO_INCREMENT,
    payroll_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_type ENUM('INCOME', 'DEDUCTION') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    PRIMARY KEY (detail_id),
    KEY idx_payroll_details_payroll (payroll_id),
    CONSTRAINT fk_payroll_details_payroll
        FOREIGN KEY (payroll_id) REFERENCES PAYROLLS(payroll_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_payroll_details_amount
        CHECK (amount >= 0)
) ENGINE=InnoDB;

-- 10. SALARY_CONFIGS
-- The report defines this configuration by employee_type and effective period;
-- it does not define an employee_id column in this table.
CREATE TABLE IF NOT EXISTS SALARY_CONFIGS (
    config_id INT NOT NULL AUTO_INCREMENT,
    employee_type ENUM('PART_TIME', 'FULL_TIME') NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    probation_hourly_rate DECIMAL(10,2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    PRIMARY KEY (config_id),
    KEY idx_salary_configs_type_period (employee_type, effective_from, effective_to),
    CONSTRAINT chk_salary_config_rates
        CHECK (hourly_rate >= 0 AND probation_hourly_rate >= 0),
    CONSTRAINT chk_salary_config_period
        CHECK (effective_to IS NULL OR effective_to >= effective_from)
) ENGINE=InnoDB;

-- 11. ACTIVITY_LOGS
CREATE TABLE IF NOT EXISTS ACTIVITY_LOGS (
    log_id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_value JSON,
    new_value JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id),
    KEY idx_activity_logs_user_created (user_id, created_at),
    CONSTRAINT fk_activity_logs_user
        FOREIGN KEY (user_id) REFERENCES USERS(user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Enforce the report's rule: an employee may have at most one attendance
-- record without check_out at a time. This uses triggers instead of adding
-- a generated/extra column to the report's 11-table schema.
DELIMITER $$

CREATE TRIGGER trg_attendance_one_open_insert
BEFORE INSERT ON ATTENDANCE
FOR EACH ROW
BEGIN
    IF NEW.check_out IS NULL THEN
        IF EXISTS (
            SELECT 1
            FROM ATTENDANCE
            WHERE employee_id = NEW.employee_id
              AND check_out IS NULL
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Employee already has an open attendance record';
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_attendance_one_open_update
BEFORE UPDATE ON ATTENDANCE
FOR EACH ROW
BEGIN
    IF NEW.check_out IS NULL THEN
        IF EXISTS (
            SELECT 1
            FROM ATTENDANCE
            WHERE employee_id = NEW.employee_id
              AND check_out IS NULL
              AND attendance_id <> OLD.attendance_id
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Employee already has an open attendance record';
        END IF;
    END IF;
END$$

DELIMITER ;
