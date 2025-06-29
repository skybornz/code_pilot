
-- Tables
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE Users (
        UserID INT PRIMARY KEY IDENTITY(1,1),
        Email NVARCHAR(255) UNIQUE NOT NULL,
        PasswordHash NVARCHAR(255) NOT NULL,
        [Role] NVARCHAR(50) NOT NULL CHECK ([Role] IN ('admin', 'user')) DEFAULT 'user',
        IsActive BIT NOT NULL DEFAULT 1,
        LastActive DATETIME2 DEFAULT GETUTCDATE(),
        BitbucketUsername NVARCHAR(255),
        BitbucketAppPassword NVARCHAR(255) -- In a real production environment, this should be encrypted
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Projects]') AND type in (N'U'))
BEGIN
    CREATE TABLE Projects (
        ProjectID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        Name NVARCHAR(255) NOT NULL,
        URL NVARCHAR(2048) NOT NULL,
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        UNIQUE (UserID, URL)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Activities]') AND type in (N'U'))
BEGIN
    CREATE TABLE Activities (
        ActivityID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(255) UNIQUE NOT NULL,
        [Type] NVARCHAR(50) NOT NULL CHECK ([Type] IN ('AI Action', 'Authentication', 'File System', 'Profile Update'))
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserActivityLog]') AND type in (N'U'))
BEGIN
    CREATE TABLE UserActivityLog (
        LogID INT PRIMARY KEY IDENTITY(1,1),
        UserID INT NOT NULL,
        ActivityID INT NOT NULL,
        Details NVARCHAR(MAX),
        [Timestamp] DATETIME2 DEFAULT GETUTCDATE(),
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Models]') AND type in (N'U'))
BEGIN
    CREATE TABLE Models (
        ModelID INT PRIMARY KEY IDENTITY(1,1),
        Name NVARCHAR(255) UNIQUE NOT NULL,
        [Type] NVARCHAR(50) NOT NULL CHECK ([Type] IN ('online', 'local')),
        IsDefault BIT NOT NULL DEFAULT 0
    );
END
GO

-- Stored Procedures
IF OBJECT_ID('sp_CreateUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_CreateUser;
GO
CREATE PROCEDURE sp_CreateUser
    @Email NVARCHAR(255),
    @PasswordHash NVARCHAR(255),
    @Role NVARCHAR(50),
    @IsActive BIT
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Users WHERE Email = @Email)
    BEGIN
        INSERT INTO Users (Email, PasswordHash, [Role], IsActive)
        VALUES (@Email, @PasswordHash, @Role, @IsActive);
        SELECT SCOPE_IDENTITY() AS UserID;
    END
    ELSE
    BEGIN
        SELECT -1 AS UserID; -- Indicates user already exists
    END
END
GO


IF OBJECT_ID('sp_GetUsers', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUsers;
GO
CREATE PROCEDURE sp_GetUsers
AS
BEGIN
    SELECT UserID, Email, [Role], IsActive, LastActive, BitbucketUsername, BitbucketAppPassword
    FROM Users;
END
GO


IF OBJECT_ID('sp_GetUserByEmail', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUserByEmail;
GO
CREATE PROCEDURE sp_GetUserByEmail
    @Email NVARCHAR(255)
AS
BEGIN
    SELECT UserID, Email, PasswordHash, [Role], IsActive, LastActive, BitbucketUsername, BitbucketAppPassword
    FROM Users
    WHERE Email = @Email;
END
GO


IF OBJECT_ID('sp_GetUserByID', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUserByID;
GO
CREATE PROCEDURE sp_GetUserByID
    @UserID INT
AS
BEGIN
    SELECT UserID, Email, PasswordHash, [Role], IsActive, LastActive, BitbucketUsername, BitbucketAppPassword
    FROM Users
    WHERE UserID = @UserID;
END
GO

IF OBJECT_ID('sp_UpdateUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateUser;
GO
CREATE PROCEDURE sp_UpdateUser
    @UserID INT,
    @Email NVARCHAR(255) = NULL,
    @PasswordHash NVARCHAR(255) = NULL,
    @Role NVARCHAR(50) = NULL,
    @IsActive BIT = NULL
AS
BEGIN
    UPDATE Users
    SET
        Email = ISNULL(@Email, Email),
        PasswordHash = ISNULL(@PasswordHash, PasswordHash),
        [Role] = ISNULL(@Role, [Role]),
        IsActive = ISNULL(@IsActive, IsActive)
    WHERE UserID = @UserID;

    IF @@ROWCOUNT > 0
        SELECT CAST(1 AS BIT) AS Result;
    ELSE
        SELECT CAST(0 AS BIT) AS Result;
END
GO

IF OBJECT_ID('sp_UpdateUserLastActive', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateUserLastActive;
GO
CREATE PROCEDURE sp_UpdateUserLastActive
    @UserID INT
AS
BEGIN
    UPDATE Users
    SET LastActive = GETUTCDATE()
    WHERE UserID = @UserID;
END
GO

IF OBJECT_ID('sp_UpdateUserBitbucketCreds', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateUserBitbucketCreds;
GO
CREATE PROCEDURE sp_UpdateUserBitbucketCreds
    @UserID INT,
    @BitbucketUsername NVARCHAR(255),
    @BitbucketAppPassword NVARCHAR(255)
AS
BEGIN
    UPDATE Users
    SET BitbucketUsername = @BitbucketUsername, BitbucketAppPassword = @BitbucketAppPassword
    WHERE UserID = @UserID;
END
GO

-- Projects SPs
IF OBJECT_ID('sp_AddProject', 'P') IS NOT NULL
    DROP PROCEDURE sp_AddProject;
GO
CREATE PROCEDURE sp_AddProject
    @UserID INT,
    @Name NVARCHAR(255),
    @URL NVARCHAR(2048)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Projects WHERE UserID = @UserID AND URL = @URL)
    BEGIN
        INSERT INTO Projects (UserID, Name, URL)
        VALUES (@UserID, @Name, @URL);
        SELECT * FROM Projects WHERE ProjectID = SCOPE_IDENTITY();
        RETURN 0; -- Success
    END
    ELSE
    BEGIN
        RETURN 1; -- Duplicate
    END
END
GO

IF OBJECT_ID('sp_GetProjectsByUser', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetProjectsByUser;
GO
CREATE PROCEDURE sp_GetProjectsByUser
    @UserID INT
AS
BEGIN
    SELECT * FROM Projects WHERE UserID = @UserID;
END
GO

IF OBJECT_ID('sp_DeleteProject', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteProject;
GO
CREATE PROCEDURE sp_DeleteProject
    @ProjectID INT,
    @UserID INT
AS
BEGIN
    DELETE FROM Projects WHERE ProjectID = @ProjectID AND UserID = @UserID;
END
GO


-- Models SPs
IF OBJECT_ID('sp_GetModels', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetModels;
GO
CREATE PROCEDURE sp_GetModels
AS
BEGIN
    SELECT ModelID, Name, [Type], IsDefault FROM Models;
END
GO

IF OBJECT_ID('sp_GetDefaultModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetDefaultModel;
GO
CREATE PROCEDURE sp_GetDefaultModel
AS
BEGIN
    SELECT TOP 1 ModelID, Name, [Type], IsDefault FROM Models WHERE IsDefault = 1;
END
GO

IF OBJECT_ID('sp_AddModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_AddModel;
GO
CREATE PROCEDURE sp_AddModel
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Models WHERE Name = @Name)
    BEGIN
        -- If this is the first model, make it the default
        DECLARE @IsDefault BIT;
        IF NOT EXISTS (SELECT 1 FROM Models)
            SET @IsDefault = 1;
        ELSE
            SET @IsDefault = 0;

        INSERT INTO Models (Name, [Type], IsDefault)
        VALUES (@Name, @Type, @IsDefault);

        SELECT * FROM Models WHERE ModelID = SCOPE_IDENTITY();
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Duplicate name
    END
END
GO

IF OBJECT_ID('sp_UpdateModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_UpdateModel;
GO
CREATE PROCEDURE sp_UpdateModel
    @ModelID INT,
    @Name NVARCHAR(255),
    @Type NVARCHAR(50)
AS
BEGIN
    -- Check for name collision (excluding the current model)
    IF NOT EXISTS (SELECT 1 FROM Models WHERE Name = @Name AND ModelID != @ModelID)
    BEGIN
        UPDATE Models
        SET Name = @Name, [Type] = @Type
        WHERE ModelID = @ModelID;
        RETURN 0;
    END
    ELSE
    BEGIN
        RETURN 1; -- Name collision
    END
END
GO

IF OBJECT_ID('sp_SetDefaultModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_SetDefaultModel;
GO
CREATE PROCEDURE sp_SetDefaultModel
    @ModelID INT
AS
BEGIN
    BEGIN TRANSACTION;
    UPDATE Models SET IsDefault = 0 WHERE IsDefault = 1;
    UPDATE Models SET IsDefault = 1 WHERE ModelID = @ModelID;
    COMMIT TRANSACTION;
END
GO

IF OBJECT_ID('sp_DeleteModel', 'P') IS NOT NULL
    DROP PROCEDURE sp_DeleteModel;
GO
CREATE PROCEDURE sp_DeleteModel
    @ModelID INT
AS
BEGIN
    -- Prevent deleting the default model
    IF EXISTS (SELECT 1 FROM Models WHERE ModelID = @ModelID AND IsDefault = 1)
    BEGIN
        RETURN 1; -- Is default
    END
    ELSE
    BEGIN
        DELETE FROM Models WHERE ModelID = @ModelID;
        RETURN 0;
    END
END
GO


-- Activity SPs
IF OBJECT_ID('sp_LogActivity', 'P') IS NOT NULL
    DROP PROCEDURE sp_LogActivity;
GO
CREATE PROCEDURE sp_LogActivity
    @UserID INT,
    @ActivityName NVARCHAR(255),
    @Details NVARCHAR(MAX)
AS
BEGIN
    DECLARE @ActivityID INT;
    DECLARE @ActivityType NVARCHAR(50);
    
    -- Determine ActivityType based on a naming convention
    SET @ActivityType = CASE
        WHEN @ActivityName IN ('Login', 'Password Change') THEN 'Authentication'
        WHEN @ActivityName = 'Update Profile' THEN 'Profile Update'
        ELSE 'AI Action'
    END;

    -- Find or create the activity
    SELECT @ActivityID = ActivityID FROM Activities WHERE Name = @ActivityName;

    IF @ActivityID IS NULL
    BEGIN
        INSERT INTO Activities (Name, [Type]) VALUES (@ActivityName, @ActivityType);
        SET @ActivityID = SCOPE_IDENTITY();
    END

    -- Log the activity
    INSERT INTO UserActivityLog (UserID, ActivityID, Details)
    VALUES (@UserID, @ActivityID, @Details);
END
GO


IF OBJECT_ID('sp_GetUserActivity', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUserActivity;
GO
CREATE PROCEDURE sp_GetUserActivity
    @UserID INT
AS
BEGIN
    SELECT
        ual.LogID,
        a.Name AS ActivityName,
        a.[Type] AS ActivityType,
        ual.Details,
        ual.[Timestamp]
    FROM UserActivityLog ual
    JOIN Activities a ON ual.ActivityID = a.ActivityID
    WHERE ual.UserID = @UserID
    ORDER BY ual.[Timestamp] DESC;
END
GO


IF OBJECT_ID('sp_GetUsageStatistics', 'P') IS NOT NULL
    DROP PROCEDURE sp_GetUsageStatistics;
GO
CREATE PROCEDURE sp_GetUsageStatistics
    @Period NVARCHAR(10) -- 'daily', 'weekly', 'monthly', 'yearly'
AS
BEGIN
    DECLARE @StartDate DATETIME;

    -- Determine start date based on the period
    SET @StartDate = CASE @Period
        WHEN 'daily' THEN CAST(GETUTCDATE() AS DATE)
        WHEN 'weekly' THEN DATEADD(wk, DATEDIFF(wk, 7, GETUTCDATE()), 0)
        WHEN 'monthly' THEN DATEADD(mm, DATEDIFF(mm, 0, GETUTCDATE()), 0)
        WHEN 'yearly' THEN DATEADD(yy, DATEDIFF(yy, 0, GETUTCDATE()), 0)
        ELSE GETUTCDATE()
    END;

    -- 1. Main Stats
    SELECT
        (SELECT COUNT(DISTINCT UserID) FROM UserActivityLog WHERE [Timestamp] >= @StartDate) AS TotalUsers,
        (SELECT COUNT(*) FROM UserActivityLog WHERE ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action') AND [Timestamp] >= @StartDate) AS TotalActions,
        (
            SELECT CAST(COUNT(*) AS FLOAT) / NULLIF(COUNT(DISTINCT UserID), 0)
            FROM UserActivityLog
            WHERE ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action') AND [Timestamp] >= @StartDate
        ) AS AvgActionsPerUser,
        (
            SELECT TOP 1 a.Name
            FROM UserActivityLog ual
            JOIN Activities a ON ual.ActivityID = a.ActivityID
            WHERE ual.[Timestamp] >= @StartDate AND a.[Type] = 'AI Action'
            GROUP BY a.Name
            ORDER BY COUNT(*) DESC
        ) AS MostUsedFeature
    
    -- 2. Feature Breakdown
    SELECT
        a.Name,
        COUNT(*) AS Actions
    FROM UserActivityLog ual
    JOIN Activities a ON ual.ActivityID = a.ActivityID
    WHERE ual.[Timestamp] >= @StartDate AND a.[Type] = 'AI Action'
    GROUP BY a.Name
    ORDER BY Actions DESC

    -- 3. Trend Data
    IF @Period = 'daily'
    BEGIN
        ;WITH Hours AS (
            SELECT TOP 24 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS Hour
            FROM master.dbo.spt_values
        ),
        HourlyData AS (
            SELECT
                DATEPART(hour, [Timestamp]) AS Name,
                COUNT(*) AS Actions
            FROM UserActivityLog
            WHERE [Timestamp] >= @StartDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
            GROUP BY DATEPART(hour, [Timestamp])
        )
        SELECT 
            FORMAT(DATEADD(hour, h.Hour, 0), 'htt') AS Name,
            ISNULL(hd.Actions, 0) AS Actions
        FROM Hours h
        LEFT JOIN HourlyData hd ON h.Hour = hd.Name
        ORDER BY h.Hour;
    END
    ELSE IF @Period = 'weekly'
    BEGIN
        ;WITH Days AS (
            SELECT TOP 7 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS DayNum
            FROM master.dbo.spt_values
        ),
        DailyData AS (
             SELECT
                DATEPART(weekday, [Timestamp]) AS Name,
                COUNT(*) AS Actions
            FROM UserActivityLog
            WHERE [Timestamp] >= @StartDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
            GROUP BY DATEPART(weekday, [Timestamp])
        )
        SELECT 
            DATENAME(weekday, DATEADD(day, d.DayNum, 0)) AS Name,
            ISNULL(dd.Actions, 0) AS Actions
        FROM Days d
        LEFT JOIN DailyData dd ON d.DayNum + 1 = dd.Name
        ORDER BY d.DayNum;
    END
    ELSE IF @Period = 'monthly'
    BEGIN
        ;WITH DateRange(Date) AS
        (
            SELECT @StartDate
            UNION ALL
            SELECT DATEADD(d, 1, Date)
            FROM DateRange
            WHERE Date < GETUTCDATE()
        ),
        DailyData AS (
            SELECT
                CAST([Timestamp] AS DATE) AS Name,
                COUNT(*) AS Actions
            FROM UserActivityLog
            WHERE [Timestamp] >= @StartDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
            GROUP BY CAST([Timestamp] AS DATE)
        )
        SELECT 
            CONVERT(VARCHAR(6), dr.Date, 107) AS Name,
            ISNULL(dd.Actions, 0) AS Actions
        FROM DateRange dr
        LEFT JOIN DailyData dd ON dr.Date = dd.Name
        OPTION (MAXRECURSION 32);
    END
     ELSE IF @Period = 'yearly'
    BEGIN
        ;WITH Months AS (
            SELECT TOP 12 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS MonthNum
            FROM master.dbo.spt_values
        ),
        MonthlyData AS (
             SELECT
                DATEPART(month, [Timestamp]) AS Name,
                COUNT(*) AS Actions
            FROM UserActivityLog
            WHERE [Timestamp] >= @StartDate AND ActivityID IN (SELECT ActivityID FROM Activities WHERE Type = 'AI Action')
            GROUP BY DATEPART(month, [Timestamp])
        )
        SELECT 
            DATENAME(month, DATEADD(month, m.MonthNum - 1, 0)) AS Name,
            ISNULL(md.Actions, 0) AS Actions
        FROM Months m
        LEFT JOIN MonthlyData md ON m.MonthNum = md.Name
        ORDER BY m.MonthNum;
    END
END
GO
