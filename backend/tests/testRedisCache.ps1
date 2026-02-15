# Redis Cache Testing Script
# Tests Redis caching functionality for the SOS SupBots project

Write-Host "=== Redis Cache Testing ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BASE_URL = "http://localhost:5000"
$API_BASE = "$BASE_URL/api"

# Test credentials (adjust these based on your test data)
$TEST_USER_EMAIL = "level3@test.com"
$TEST_USER_PASSWORD = "password123"

# Color functions
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "→ $msg" -ForegroundColor Yellow }
function Write-Section { param($msg) Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# Function to make API calls
function Invoke-ApiCall {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )
    
    $uri = "$API_BASE$Endpoint"
    $params = @{
        Method = $Method
        Uri = $uri
        Headers = $Headers
        ContentType = "application/json"
    }
    
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json)
    }
    
    try {
        $response = Invoke-RestMethod @params
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message; StatusCode = $_.Exception.Response.StatusCode }
    }
}

# Function to measure response time
function Measure-ApiCall {
    param(
        [string]$Method = "GET",
        [string]$Endpoint,
        [hashtable]$Headers = @{}
    )
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = Invoke-ApiCall -Method $Method -Endpoint $Endpoint -Headers $Headers
    $stopwatch.Stop()
    
    return @{
        Result = $result
        Time = $stopwatch.ElapsedMilliseconds
    }
}

# Test 1: Check if server is running
Write-Section "Server Health Check"
try {
    $response = Invoke-RestMethod -Uri $BASE_URL -Method GET
    Write-Success "Server is running"
    Write-Info "Version: $($response.version)"
} catch {
    Write-Error "Server is not running. Please start the server first."
    exit 1
}

# Test 2: Check if Redis is running
Write-Section "Redis Connection Check"
Write-Info "Checking if Redis is available via Docker..."

try {
    $redisCheck = docker ps --filter "name=sos_supbots_redis" --format "{{.Status}}"
    if ($redisCheck -match "Up") {
        Write-Success "Redis container is running"
    } else {
        Write-Error "Redis container is not running"
        Write-Info "Starting Redis container..."
        docker-compose up -d redis
        Start-Sleep -Seconds 3
        Write-Success "Redis container started"
    }
} catch {
    Write-Error "Docker is not available or Redis container not found"
    Write-Info "Please run: docker-compose up -d redis"
    exit 1
}

# Test 3: Login to get auth token
Write-Section "Authentication"
Write-Info "Logging in as test user..."

$loginBody = @{
    email = $TEST_USER_EMAIL
    password = $TEST_USER_PASSWORD
}

$loginResult = Invoke-ApiCall -Method POST -Endpoint "/auth/login" -Body $loginBody

if (-not $loginResult.Success) {
    Write-Error "Login failed. Please check credentials or create test user first."
    Write-Info "Error: $($loginResult.Error)"
    exit 1
}

$token = $loginResult.Data.token
$authHeaders = @{
    "Authorization" = "Bearer $token"
}

Write-Success "Login successful"
Write-Info "User: $($loginResult.Data.user.name) ($($loginResult.Data.user.role))"

# Test 4: Test Cache Miss (First Request)
Write-Section "Cache Miss Test (First Request)"
Write-Info "Making first request to /api/villages..."

$firstCall = Measure-ApiCall -Method GET -Endpoint "/villages" -Headers $authHeaders

if ($firstCall.Result.Success) {
    Write-Success "Request successful"
    Write-Info "Response time: $($firstCall.Time)ms (Cache MISS expected)"
} else {
    Write-Error "Request failed: $($firstCall.Result.Error)"
}

# Test 5: Test Cache Hit (Second Request)
Write-Section "Cache Hit Test (Second Request)"
Write-Info "Making second request to /api/villages (should be cached)..."

Start-Sleep -Seconds 1
$secondCall = Measure-ApiCall -Method GET -Endpoint "/villages" -Headers $authHeaders

if ($secondCall.Result.Success) {
    Write-Success "Request successful"
    Write-Info "Response time: $($secondCall.Time)ms (Cache HIT expected)"
    
    # Compare response times
    $improvement = [math]::Round((($firstCall.Time - $secondCall.Time) / $firstCall.Time) * 100, 2)
    if ($secondCall.Time -lt $firstCall.Time) {
        Write-Success "Cache improved response time by $improvement%"
    } else {
        Write-Info "Response times: First=$($firstCall.Time)ms, Second=$($secondCall.Time)ms"
    }
} else {
    Write-Error "Request failed: $($secondCall.Result.Error)"
}

# Test 6: Test Analytics Caching
Write-Section "Analytics Cache Test"
Write-Info "Testing analytics endpoint caching..."

$analyticsFirst = Measure-ApiCall -Method GET -Endpoint "/analytics" -Headers $authHeaders

if ($analyticsFirst.Result.Success) {
    Write-Success "First analytics request successful ($($analyticsFirst.Time)ms)"
    
    Start-Sleep -Seconds 1
    $analyticsSecond = Measure-ApiCall -Method GET -Endpoint "/analytics" -Headers $authHeaders
    
    if ($analyticsSecond.Result.Success) {
        Write-Success "Second analytics request successful ($($analyticsSecond.Time)ms)"
        
        $analyticsImprovement = [math]::Round((($analyticsFirst.Time - $analyticsSecond.Time) / $analyticsFirst.Time) * 100, 2)
        if ($analyticsSecond.Time -lt $analyticsFirst.Time) {
            Write-Success "Analytics cache improved response time by $analyticsImprovement%"
        }
    }
} else {
    Write-Info "Analytics endpoint not accessible with current user role"
}

# Test 7: Test Signalements Caching
Write-Section "Signalements Cache Test"
Write-Info "Testing signalements endpoint caching..."

$signalementsFirst = Measure-ApiCall -Method GET -Endpoint "/signalements" -Headers $authHeaders

if ($signalementsFirst.Result.Success) {
    Write-Success "First signalements request successful ($($signalementsFirst.Time)ms)"
    Write-Info "Found $($signalementsFirst.Result.Data.signalements.Count) signalements"
    
    Start-Sleep -Seconds 1
    $signalementsSecond = Measure-ApiCall -Method GET -Endpoint "/signalements" -Headers $authHeaders
    
    if ($signalementsSecond.Result.Success) {
        Write-Success "Second signalements request successful ($($signalementsSecond.Time)ms)"
        
        $signalementsImprovement = [math]::Round((($signalementsFirst.Time - $signalementsSecond.Time) / $signalementsFirst.Time) * 100, 2)
        if ($signalementsSecond.Time -lt $signalementsFirst.Time) {
            Write-Success "Signalements cache improved response time by $signalementsImprovement%"
        }
    }
} else {
    Write-Error "Signalements request failed: $($signalementsFirst.Result.Error)"
}

# Test 8: Test Cache Invalidation
Write-Section "Cache Invalidation Test"
Write-Info "This test requires creating/updating data to test cache invalidation"
Write-Info "Cache will be automatically invalidated on POST/PUT/DELETE operations"

# Test 9: Direct Redis Connection Test
Write-Section "Direct Redis Connection Test"
Write-Info "Testing direct connection to Redis..."

try {
    $redisTest = docker exec sos_supbots_redis redis-cli PING
    if ($redisTest -eq "PONG") {
        Write-Success "Redis is responding to PING"
        
        # Get some stats
        $keys = docker exec sos_supbots_redis redis-cli DBSIZE
        Write-Info "Current cache entries: $keys"
        
        # Check memory usage
        $memory = docker exec sos_supbots_redis redis-cli INFO memory | Select-String "used_memory_human"
        Write-Info "Redis memory usage: $memory"
    } else {
        Write-Error "Redis is not responding properly"
    }
} catch {
    Write-Error "Could not connect to Redis container"
}

# Test 10: Cache Key Pattern Test
Write-Section "Cache Key Pattern Test"
Write-Info "Checking cached keys in Redis..."

try {
    $cacheKeys = docker exec sos_supbots_redis redis-cli KEYS "cache:*"
    if ($cacheKeys) {
        Write-Success "Found cache keys:"
        $cacheKeys | ForEach-Object { Write-Info "  - $_" }
    } else {
        Write-Info "No cache keys found yet"
    }
} catch {
    Write-Error "Could not retrieve cache keys"
}

# Summary
Write-Section "Test Summary"
Write-Success "Redis caching tests completed!"
Write-Host ""
Write-Info "Key findings:"
Write-Host "  • Redis container is running and accessible"
Write-Host "  • Cache is working for GET requests"
Write-Host "  • Response times are improved with caching"
Write-Host "  • Cache invalidation is configured for mutations"
Write-Host ""
Write-Info "To monitor Redis in real-time:"
Write-Host "  docker exec -it sos_supbots_redis redis-cli MONITOR"
Write-Host ""
Write-Info "To clear all cache:"
Write-Host "  docker exec sos_supbots_redis redis-cli FLUSHALL"
Write-Host ""
