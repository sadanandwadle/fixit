$baseUrl = "http://localhost:5000/api/auth"

function Test-Endpoint {
    param (
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null,
        [string]$Token = $null,
        [int]$ExpectedStatus
    )
    
    $headers = @{ "Content-Type" = "application/json" }
    if ($Token) { $headers["Authorization"] = "Bearer $Token" }
    
    $bodyJson = $null
    if ($Body) { $bodyJson = $Body | ConvertTo-Json }
    
    Write-Host "Testing: $Name"
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers -Body $bodyJson -SkipHttpErrorCheck -ResponseHeadersVariable resHeaders -StatusCodeVariable status
        
        if ($status -eq $ExpectedStatus) {
            Write-Host "  [PASS] Status $status" -ForegroundColor Green
            return $response
        } else {
            Write-Host "  [FAIL] Expected $ExpectedStatus but got $status" -ForegroundColor Red
            return $response
        }
    } catch {
        Write-Host "  [ERROR] $_" -ForegroundColor Red
    }
}

# 1. Valid Registration
$reg1 = Test-Endpoint -Name "Valid Customer Registration" -Method "POST" -Endpoint "/register" -Body @{name="Alice";email="alice@test.com";password="password123";role="customer"} -ExpectedStatus 201
$token = $reg1.token

# 2. Duplicate Registration
Test-Endpoint -Name "Duplicate Registration" -Method "POST" -Endpoint "/register" -Body @{name="Alice2";email="alice@test.com";password="password123"} -ExpectedStatus 400

# 3. Invalid Registration
Test-Endpoint -Name "Invalid Registration (Missing Pwd)" -Method "POST" -Endpoint "/register" -Body @{name="Alice2";email="alice2@test.com"} -ExpectedStatus 400

# 4. Valid Provider Registration
Test-Endpoint -Name "Valid Provider Registration" -Method "POST" -Endpoint "/register" -Body @{name="Bob";email="bob@test.com";password="password123";role="provider"} -ExpectedStatus 201

# 5. Public Admin Registration Prevention
$adminReg = Test-Endpoint -Name "Public Admin Registration Prevention" -Method "POST" -Endpoint "/register" -Body @{name="Eve";email="eve@test.com";password="password123";role="admin"} -ExpectedStatus 201
if ($adminReg.user.role -ne "admin") {
    Write-Host "  [PASS] Admin registration was properly downgraded to customer/provider" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] User was successfully created as admin" -ForegroundColor Red
}

# 6. Valid Login
$login = Test-Endpoint -Name "Valid Login" -Method "POST" -Endpoint "/login" -Body @{email="alice@test.com";password="password123"} -ExpectedStatus 200

# 7. Invalid Login
Test-Endpoint -Name "Invalid Login" -Method "POST" -Endpoint "/login" -Body @{email="alice@test.com";password="wrongpassword"} -ExpectedStatus 401

# 8. JWT Valid Token (/me)
Test-Endpoint -Name "Protected Route (Valid Token)" -Method "GET" -Endpoint "/me" -Token $token -ExpectedStatus 200

# 9. JWT Missing Token (/me)
Test-Endpoint -Name "Protected Route (Missing Token)" -Method "GET" -Endpoint "/me" -ExpectedStatus 401

# 10. JWT Invalid Token (/me)
Test-Endpoint -Name "Protected Route (Invalid Token)" -Method "GET" -Endpoint "/me" -Token "invalid_token_123" -ExpectedStatus 401

