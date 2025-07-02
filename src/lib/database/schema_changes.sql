-- This file contains the SQL commands to update your database schema to support storing a URL for local models.
-- Please execute these commands on your SQL Server database.

-- 1. Add the URL column to the Models table
-- This allows storing the host URL (e.g., http://127.0.0.1:11434) for local Ollama models.
IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'URL' AND Object_ID = Object_ID(N'dbo.Models'))
BEGIN
    ALTER TABLE dbo.Models
    ADD URL NVARCHAR(255) NULL;
    PRINT 'Added URL column to Models table.';
END
ELSE
BEGIN
    PRINT 'URL column already exists in Models table.';
END
GO

-- 2. Update the sp_GetModels stored procedure
-- This procedure will now return the URL column.
ALTER PROCEDURE [dbo].[sp_GetModels]
AS
BEGIN
    SELECT ModelID, Name, Type, IsDefault, URL FROM Models ORDER BY IsDefault DESC, Name ASC;
END
GO
PRINT 'Updated sp_GetModels stored procedure.';

-- 3. Update the sp_GetDefaultModel stored procedure
-- This procedure will now return the URL column for the default model.
ALTER PROCEDURE [dbo].[sp_GetDefaultModel]
AS
BEGIN
    SELECT TOP 1 ModelID, Name, Type, IsDefault, URL FROM Models WHERE IsDefault = 1;
END
GO
PRINT 'Updated sp_GetDefaultModel stored procedure.';

-- 4. Update the sp_AddModel stored procedure
-- This procedure now accepts a URL parameter when creating a new model.
ALTER PROCEDURE [dbo].[sp_AddModel]
    @Name NVARCHAR(100),
    @Type NVARCHAR(50),
    @URL NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if a model with the same name already exists
    IF EXISTS (SELECT 1 FROM Models WHERE Name = @Name)
    BEGIN
        -- Return a specific value to indicate a duplicate name
        RETURN 1;
    END

    -- If no models exist, this one becomes the default
    DECLARE @IsDefault BIT;
    IF NOT EXISTS (SELECT 1 FROM Models)
    BEGIN
        SET @IsDefault = 1;
    END
    ELSE
    BEGIN
        SET @IsDefault = 0;
    END

    INSERT INTO Models (Name, Type, IsDefault, URL)
    VALUES (@Name, @Type, @IsDefault, @URL);
    
    DECLARE @NewModelID INT = SCOPE_IDENTITY();

    SELECT ModelID, Name, Type, IsDefault, URL
    FROM Models
    WHERE ModelID = @NewModelID;

    RETURN 0;
END
GO
PRINT 'Updated sp_AddModel stored procedure.';


-- 5. Update the sp_UpdateModel stored procedure
-- This procedure now allows updating the URL of a model.
ALTER PROCEDURE [dbo].[sp_UpdateModel]
    @ModelID INT,
    @Name NVARCHAR(100),
    @Type NVARCHAR(50),
    @URL NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Check if another model with the new name already exists
    IF EXISTS (SELECT 1 FROM Models WHERE Name = @Name AND ModelID <> @ModelID)
    BEGIN
        RETURN 1; -- Duplicate name error
    END

    UPDATE Models
    SET
        Name = @Name,
        Type = @Type,
        URL = @URL
    WHERE ModelID = @ModelID;

    IF @@ROWCOUNT = 0
    BEGIN
        RETURN 2; -- Model not found error
    END

    RETURN 0; -- Success
END
GO
PRINT 'Updated sp_UpdateModel stored procedure.';
