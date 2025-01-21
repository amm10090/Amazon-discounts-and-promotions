# Amazon PA-API 5.0 开发指南

## 目录

1. [简介](#简介)
2. [注册与配置](#注册与配置)
3. [API基本使用](#api基本使用)
4. [核心操作和资源](#核心操作和资源)
5. [开发建议](#开发建议)
6. [故障排除](#故障排除)
7. [搜索优化](#搜索优化)

## 简介

Amazon Product Advertising API (PA-API) 5.0是亚马逊提供的产品数据访问接口，可用于获取产品信息、价格、评论等数据。本文档将指导您完成PA-API的配置和使用。

### 主要功能

- 搜索产品信息
- 获取产品详情
- 查询产品价格和促销
- 获取产品评论
- 浏览产品类别

## 注册与配置

### 1. 注册步骤

1. 注册Amazon Associates(联盟)账号
2. 访问 [PA-API注册页面](https://webservices.amazon.com/paapi5/documentation/register-for-pa-api.html)
3. 创建安全凭证(AWS Access Key ID和Secret Key)
4. 获取Associate Tag

### 2. 配置要求

```env
AWS_ACCESS_KEY=your_access_key_id
AWS_SECRET_KEY=your_secret_key
AWS_ASSOCIATE_TAG=your_associate_tag
AWS_HOST=webservices.amazon.com
AWS_REGION=us-west-2
```

## API基本使用

### 1. 认证

PA-API使用AWS签名版本4进行请求认证。每个请求需要包含以下Header:

```
Authorization: AWS4-HMAC-SHA256 
  Credential=ACCESS_KEY/REQUEST_DATE/REGION/SERVICE/aws4_request,
  SignedHeaders=host;x-amz-date,
  Signature=SIGNATURE
X-Amz-Date: REQUEST_TIMESTAMP
```

### 2. 基本请求示例

```bash
curl -X POST \
  'https://webservices.amazon.com/paapi5/searchitems' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: AWS4-HMAC-SHA256 ...' \
  -H 'X-Amz-Date: 20240119T000000Z' \
  -d '{
    "Keywords": "laptop",
    "Resources": [
      "Images.Primary.Medium",
      "ItemInfo.Title",
      "Offers.Listings.Price"
    ],
    "PartnerTag": "YOUR_PARTNER_TAG",
    "PartnerType": "Associates",
    "Marketplace": "www.amazon.com"
  }'
```

## 核心操作和资源

### 1. API操作详解

#### SearchItems 操作
- 功能：搜索商品
- 必选参数：
  - `Keywords`: 搜索关键词
  - `PartnerTag`: 联盟标签
  - `PartnerType`: 合作伙伴类型
- 可选参数：
  - `SearchIndex`: 搜索类别
  - `BrowseNodeId`: 类目ID
  - `SortBy`: 排序方式
  - `ItemCount`: 返回数量(1-10)
  
示例请求:
```json
{
    "Keywords": "笔记本电脑",
    "Resources": [
        "Images.Primary.Large",
        "ItemInfo.Title",
        "Offers.Listings.Price"
    ],
    "SearchIndex": "Electronics",
    "ItemCount": 10,
    "BrowseNodeId": "284507",
    "SortBy": "Featured"
}
```

#### GetItems 操作
- 功能：获取商品详情
- 必选参数：
  - `ItemIds`: ASIN列表
  - `PartnerTag`: 联盟标签
  - `PartnerType`: 合作伙伴类型
- 可选参数：
  - `Condition`: 商品状态
  - `CurrencyOfPreference`: 货币偏好
  - `LanguagesOfPreference`: 语言偏好

示例请求:
```json
{
    "ItemIds": ["B07JW9H4J1", "B07PXGQC1Q"],
    "Resources": [
        "Images.Primary.Large",
        "ItemInfo.Features",
        "Offers.Listings.Price",
        "CustomerReviews"
    ],
    "PartnerTag": "tag-20",
    "PartnerType": "Associates",
    "Condition": "New"
}
```

#### GetBrowseNodes 操作
- 功能：获取类目信息
- 必选参数：
  - `BrowseNodeIds`: 类目ID列表
  - `PartnerTag`: 联盟标签
  - `PartnerType`: 合作伙伴类型
- 可选参数：
  - `LanguagesOfPreference`: 语言偏好

示例请求:
```json
{
    "BrowseNodeIds": ["283155", "3040"],
    "Resources": [
        "BrowseNodes.Ancestor",
        "BrowseNodes.Children"
    ],
    "PartnerTag": "tag-20",
    "PartnerType": "Associates"
}
```

### 2. 资源类型详解

#### Images 资源
图片资源包含以下尺寸:
- `Small`: 小尺寸图片
- `Medium`: 中尺寸图片
- `Large`: 大尺寸图片
- `Variant`: 变体图片

每个尺寸包含:
- `URL`: 图片地址
- `Height`: 高度
- `Width`: 宽度

#### ItemInfo 资源
商品基本信息包含:
- `Title`: 商品标题
- `Features`: 商品特性
- `ProductInfo`: 产品信息
- `ContentInfo`: 内容信息
- `ManufactureInfo`: 制造商信息
- `TechnicalInfo`: 技术信息

#### Offers 资源
价格和促销信息包含:
- `Listings`: 商品报价列表
  - `Price`: 价格信息
  - `SavePrice`: 节省金额
  - `Availability`: 库存状态
- `Summaries`: 价格概要
  - `LowestPrice`: 最低价格
  - `HighestPrice`: 最高价格
  - `OfferCount`: 报价数量

### 3. 通用请求参数

所有API操作都支持以下通用参数:

| 参数名 | 说明 | 是否必选 |
|--------|------|----------|
| PartnerTag | 联盟标签 | 是 |
| PartnerType | 合作伙伴类型 | 是 |
| Marketplace | 目标市场 | 否 |
| Resources | 返回资源类型 | 否 |
| LanguagesOfPreference | 语言偏好 | 否 |
| CurrencyOfPreference | 货币偏好 | 否 |

### 4. 响应处理

所有API响应都包含以下基本结构:
```json
{
    "操作名Result": {
        "Items": [],
        "SearchRefinements": {},
        "TotalResultCount": 0
    },
    "Errors": []
}
```

错误响应示例:
```json
{
    "Errors": [
        {
            "Code": "InvalidParameterValue",
            "Message": "参数值无效"
        }
    ]
}
```

## 开发建议

### 1. SDK使用建议

- 优先使用官方SDK
  - 自动处理请求签名
  - 处理序列化和反序列化
  - 提供类型安全的接口
  - 简化错误处理

### 2. 凭证使用规范

- 正确使用访问凭证
  - Access Key和Secret Key必须配对使用
  - Partner Tag必须与您的Associates账号关联
  - 不要修改返回的商品链接，避免丢失佣金归属
  - 定期检查凭证有效性

### 3. 缓存策略

#### 缓存配置
不同资源的推荐缓存时间:

| 资源类型 | 缓存时间 |
|---------|---------|
| Offers (价格和促销) | 1小时 |
| BrowseNodeInfo (类目信息) | 1小时 |
| 其他资源(图片、商品信息等) | 24小时 |

#### 缓存实现建议
```python
class ProductCache:
    def __init__(self):
        self.cache = {}
        self.ttl = {
            'Offers': 3600,  # 1小时
            'BrowseNodeInfo': 3600,
            'default': 86400  # 24小时
        }
    
    async def get_product(self, asin: str, resources: List[str]):
        # 检查缓存中是否有所需资源
        cached_data = self.get_cached_resources(asin, resources)
        missing_resources = self.get_missing_resources(asin, resources)
        
        if missing_resources:
            # 只请求缺失的资源
            new_data = await api.get_items(
                ItemIds=[asin],
                Resources=missing_resources
            )
            self.update_cache(asin, new_data)
            
        return self.merge_data(cached_data, new_data)
```

### 4. 性能优化

- 批量请求处理
  - GetItems操作最多支持10个ASIN
  - GetBrowseNodes操作最多支持10个类目ID
  - 合并请求减少API调用次数

- 资源请求优化
  - 只请求必要的资源字段
  - 使用合适的图片尺寸
  - 避免请求不必要的价格历史数据

- 异步处理
```python
async def batch_get_items(asin_list: List[str]):
    tasks = []
    # 将ASIN列表分成最多10个一组
    for chunk in chunks(asin_list, 10):
        task = api.get_items(ItemIds=chunk)
        tasks.append(task)
    return await asyncio.gather(*tasks)
```

### 5. 流量控制

#### 请求频率限制
- 实现令牌桶算法控制请求速率
- 处理TooManyRequests错误
- 实现指数退避重试

```python
class RateLimiter:
    def __init__(self, rate: int, burst: int):
        self.rate = rate
        self.burst = burst
        self.tokens = burst
        self.last_update = time.time()
        
    async def acquire(self):
        now = time.time()
        # 更新令牌
        self.tokens = min(
            self.burst,
            self.tokens + (now - self.last_update) * self.rate
        )
        
        if self.tokens < 1:
            await asyncio.sleep(1)
            return await self.acquire()
            
        self.tokens -= 1
        self.last_update = now
        return True
```

#### 爬虫流量处理
- 使用robots.txt限制爬虫访问
- 实现请求频率限制
- 添加用户代理识别
- 监控异常流量模式

### 6. 错误处理最佳实践

- 实现分级重试策略
  - 网络错误：立即重试
  - 限流错误：延迟重试
  - 验证错误：检查配置

```python
async def retry_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except AmazonApiError as e:
            if e.code == "TooManyRequests":
                # 指数退避重试
                await asyncio.sleep(2 ** attempt)
                continue
            elif e.code == "InvalidSignature":
                # 验证错误不重试
                raise
            else:
                # 其他错误等待后重试
                await asyncio.sleep(1)
                continue
    raise Exception("Max retries exceeded")
```

### 7. 监控和日志

- 记录关键指标
  - API调用次数
  - 响应时间
  - 错误率
  - 缓存命中率

- 实现日志记录
```python
async def log_api_call(func):
    start_time = time.time()
    try:
        result = await func()
        duration = time.time() - start_time
        logger.info(f"API调用成功: {duration:.2f}秒")
        return result
    except Exception as e:
        logger.error(f"API调用失败: {str(e)}")
        raise
```

### 7. 错误消息示例

#### 认证相关错误

1. Access Key未启用
```json
{
    "__type": "com.amazon.paapi#AccessDeniedException",
    "Errors": [
        {
            "Code": "AccessDenied",
            "Message": "Access Key未启用PA-API访问权限。请参考PA-API注册指南进行注册。"
        }
    ]
}
```

2. 关联账号验证失败
```json
{
    "__type": "com.amazon.paapi#AssociateValidationException",
    "Errors": [
        {
            "Code": "InvalidAssociate",
            "Message": "您的Access Key未关联到已审核通过的联盟账号。请访问联盟中心。"
        }
    ]
}
```

#### 参数验证错误

1. 缺少必需参数PartnerTag
```json
{
    "__type": "com.amazon.paapi#ValidationException",
    "Errors": [
        {
            "Code": "MissingParameter",
            "Message": "必须提供PartnerTag参数。"
        }
    ]
}
```

2. PartnerTag值无效
```json
{
    "__type": "com.amazon.paapi#InvalidPartnerTagException",
    "Errors": [
        {
            "Code": "InvalidPartnerTag",
            "Message": "提供的PartnerTag未与您的Access Key关联的有效联盟商店匹配。"
        }
    ]
}
```

3. 无效的Marketplace值
```json
{
    "__type": "com.amazon.paapi#ValidationException",
    "Errors": [
        {
            "Code": "InvalidParameterValue",
            "Message": "请求中提供的Marketplace值www.amazon123.com无效。"
        }
    ]
}
```

#### 请求错误

1. 签名不完整
```json
{
    "__type": "com.amazon.paapi#IncompleteSignatureException",
    "Errors": [
        {
            "Code": "IncompleteSignature",
            "Message": "请求签名缺少必需组件。如果使用AWS SDK，签名会自动处理。"
        }
    ]
}
```

2. 签名无效
```json
{
    "__type": "com.amazon.paapi#InvalidSignatureException",
    "Errors": [
        {
            "Code": "InvalidSignature",
            "Message": "请求签名无效。如果使用AWS SDK，签名会自动处理。"
        }
    ]
}
```

3. 请求过期
```json
{
    "__type": "com.amazon.paapi#RequestExpiredException",
    "Errors": [
        {
            "Code": "RequestExpired",
            "Message": "请求已过期。签名请求的有效期为15分钟。"
        }
    ]
}
```

#### 限流错误

```json
{
    "__type": "com.amazon.paapi#TooManyRequestsException",
    "Errors": [
        {
            "Code": "TooManyRequests",
            "Message": "由于请求频率过高，请求被拒绝。请验证对Amazon PA-API的请求频率。"
        }
    ]
}
```

### 8. 错误处理建议

#### 认证错误处理
```python
async def handle_auth_error(error):
    if error.code == "AccessDenied":
        # 检查API访问权限
        await verify_api_access()
    elif error.code == "InvalidAssociate":
        # 检查联盟账号状态
        await verify_associate_status()
    elif error.code == "InvalidSignature":
        # 刷新认证信息
        await refresh_credentials()
```

#### 参数错误处理
```python
async def handle_validation_error(error):
    if error.code == "MissingParameter":
        # 补充必需参数
        params = await complete_required_params()
        return await retry_request(params)
    elif error.code == "InvalidParameterValue":
        # 验证参数值
        params = await validate_params()
        return await retry_request(params)
```

#### 请求错误处理
```python
async def handle_request_error(error):
    if error.code == "RequestExpired":
        # 更新请求时间戳
        await update_request_timestamp()
        return await retry_request()
    elif error.code == "IncompleteSignature":
        # 重新生成签名
        await regenerate_signature()
        return await retry_request()
```

### 9. 错误预防建议

1. 认证安全
   - 定期更新Access Key
   - 使用环境变量存储密钥
   - 实现密钥自动轮换
   - 监控认证失败次数

2. 请求优化
   - 实现请求重试机制
   - 使用请求队列管理
   - 实现请求限流
   - 优化批量请求

3. 监控告警
   - 监控错误率
   - 设置错误阈值告警
   - 记录详细错误日志
   - 实现自动恢复机制

## 故障排除

### 1. 错误响应格式

PA-API的错误响应包含在JSON响应的`Errors`属性中，每个错误包含以下信息：

```json
{
    "Errors": [
        {
            "__type": "com.amazon.paapi#ErrorData",
            "Code": "错误代码",
            "Message": "错误描述信息"
        }
    ]
}
```

### 2. 错误码分类

PA-API的错误码分为两大类：

#### 5xx 服务器错误
服务器端错误，表示PA-API服务器在处理看似有效的请求时发生错误。

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 500 | 内部服务器错误 | 稍后重试，如果持续出现请联系支持 |
| 503 | 服务不可用 | 实现指数退避重试机制 |
| 504 | 网关超时 | 检查网络连接，适当增加超时时间 |

#### 4xx 客户端错误
由于请求无效或不正确导致的错误。

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求格式错误 | 检查请求参数和格式 |
| 401 | 未授权 | 验证认证信息是否正确 |
| 403 | 禁止访问 | 检查访问权限和API密钥 |
| 404 | 资源不存在 | 验证请求的资源是否有效 |
| 429 | 请求过多 | 实现请求限流，使用缓存 |

#### 业务错误码

| 错误码 | 说明 | 示例 | 处理建议 |
|--------|------|------|----------|
| InvalidSignature | 签名验证失败 | 请求签名无效 | 检查签名计算过程 |
| AccessDenied | 访问被拒绝 | 无权访问请求的资源 | 确认账号状态和权限 |
| InvalidParameterValue | 参数值无效 | ASIN格式错误 | 检查参数格式和范围 |
| MissingParameter | 缺少必需参数 | 未提供PartnerTag | 补充必需参数 |
| TooManyRequests | 超过请求限制 | 请求频率过高 | 实现限流和缓存 |
| ResourceNotFound | 资源未找到 | 商品不存在 | 验证资源ID |
| InvalidRequest | 请求无效 | JSON格式错误 | 检查请求格式 |

### 3. 错误处理示例

#### 服务器错误处理
```python
async def handle_server_error(error):
    if error.code.startswith('5'):
        # 实现指数退避重试
        for attempt in range(3):
            try:
                await asyncio.sleep(2 ** attempt)
                return await retry_request()
            except Exception:
                continue
    raise error
```

#### 客户端错误处理
```python
async def handle_client_error(error):
    if error.code == '429':
        # 限流处理
        await rate_limiter.wait()
        return await retry_request()
    elif error.code == '401':
        # 认证错误
        await refresh_credentials()
        return await retry_request()
    else:
        # 其他客户端错误
        raise error
```

#### 业务错误处理
```python
async def handle_business_error(error):
    if error.code == 'InvalidParameterValue':
        # 参数验证
        validated_params = await validate_params(error.params)
        return await retry_request(validated_params)
    elif error.code == 'TooManyRequests':
        # 请求限流
        await implement_backoff(error)
        return await retry_request()
    else:
        # 记录错误并报告
        await log_error(error)
        raise error
```

### 4. 故障排除流程

1. 确认错误类型
```python
def diagnose_error(error):
    if error.code == "InvalidSignature":
        return "认证错误"
    elif error.code == "TooManyRequests":
        return "限流错误"
    elif error.code == "InvalidParameterValue":
        return "参数错误"
    else:
        return "其他错误"
```

2. 收集错误信息
```python
def collect_error_info(error, request):
    return {
        "error_code": error.code,
        "error_message": error.message,
        "request_id": request.headers.get("x-amz-request-id"),
        "timestamp": datetime.now().isoformat(),
        "request_params": request.params
    }
```

3. 实现错误恢复
```python
async def handle_error(error, request):
    error_type = diagnose_error(error)
    error_info = collect_error_info(error, request)
    
    if error_type == "认证错误":
        # 检查认证信息
        await verify_credentials()
    elif error_type == "限流错误":
        # 实现退避重试
        await implement_backoff()
    elif error_type == "参数错误":
        # 验证参数
        await validate_parameters()
```

### 5. 调试工具和技巧

#### API调试工具
- 使用PA-API Scratchpad
  - 快速测试API请求
  - 验证参数正确性
  - 查看原始响应

- 使用抓包工具
  - 分析请求头和签名
  - 检查网络问题
  - 验证请求格式

#### 日志分析
```python
class APILogger:
    def __init__(self):
        self.logger = logging.getLogger("paapi")
        
    def log_request(self, request):
        self.logger.info(f"API请求: {request.method} {request.url}")
        self.logger.debug(f"请求参数: {request.params}")
        
    def log_response(self, response):
        self.logger.info(f"响应状态: {response.status_code}")
        self.logger.debug(f"响应内容: {response.content}")
        
    def log_error(self, error):
        self.logger.error(f"错误类型: {error.code}")
        self.logger.error(f"错误信息: {error.message}")
```

#### 性能分析
```python
class APIMonitor:
    def __init__(self):
        self.metrics = defaultdict(list)
        
    def record_timing(self, operation, duration):
        self.metrics[operation].append(duration)
        
    def get_statistics(self, operation):
        times = self.metrics[operation]
        return {
            "count": len(times),
            "avg_time": sum(times) / len(times),
            "max_time": max(times),
            "min_time": min(times)
        }
```

### 6. 常见问题检查清单

1. 认证问题
   - [ ] Access Key和Secret Key是否正确
   - [ ] Partner Tag是否有效
   - [ ] 账号状态是否正常
   - [ ] 系统时间是否准确

2. 请求问题
   - [ ] 参数格式是否正确
   - [ ] 必需参数是否完整
   - [ ] 请求频率是否合理
   - [ ] 请求签名是否正确

3. 响应问题
   - [ ] 是否处理了所有错误情况
   - [ ] 是否正确解析响应数据
   - [ ] 是否实现了重试机制
   - [ ] 是否记录了错误日志

## 搜索优化

### 1. 动态搜索优化

PA-API提供了SearchRefinements资源来优化搜索结果。当进行相关搜索请求时，可以获取动态优化选项，如作者、品牌等。

#### 基本使用流程

1. 初始搜索请求
```json
{
    "Keywords": "java编程",
    "SearchIndex": "Books",
    "Resources": ["SearchRefinements"],
    "PartnerTag": "tag-20",
    "PartnerType": "Associates",
    "Marketplace": "www.amazon.com"
}
```

2. 处理搜索优化响应
```python
def parse_refinements(response):
    refinements = response.get("SearchRefinements", {})
    other_refinements = refinements.get("OtherRefinements", [])
    
    result = {}
    for refinement in other_refinements:
        refinement_id = refinement.get("Id")
        bins = refinement.get("Bins", [])
        result[refinement_id] = [
            {
                "name": bin.get("DisplayName"),
                "id": bin.get("Id")
            }
            for bin in bins
        ]
    return result
```

3. 使用优化选项进行二次搜索
```python
async def refined_search(keywords: str, refinement: dict):
    """
    使用优化选项进行搜索
    
    :param keywords: 搜索关键词
    :param refinement: 优化选项，如{"Author": "作者名"}
    :return: 搜索结果
    """
    request = {
        "Keywords": keywords,
        "SearchIndex": "Books",
        "Resources": ["ItemInfo.Title", "Images.Primary.Medium"],
        "PartnerTag": "tag-20",
        "PartnerType": "Associates",
        **refinement
    }
    return await api.search_items(**request)
```

### 2. 搜索优化示例

#### 图书搜索优化
```python
async def search_books_with_refinements():
    # 1. 初始搜索
    initial_response = await api.search_items(
        Keywords="python编程",
        SearchIndex="Books",
        Resources=["SearchRefinements"]
    )
    
    # 2. 获取作者列表
    refinements = parse_refinements(initial_response)
    authors = refinements.get("Author", [])
    
    # 3. 使用作者进行优化搜索
    if authors:
        author = authors[0]  # 选择第一个作者
        refined_results = await refined_search(
            keywords="python编程",
            refinement={"Author": author["id"]}
        )
        return refined_results
```

#### 电子产品搜索优化
```python
async def search_electronics_with_brand():
    # 1. 初始搜索
    initial_response = await api.search_items(
        Keywords="笔记本电脑",
        SearchIndex="Electronics",
        Resources=["SearchRefinements"]
    )
    
    # 2. 获取品牌列表
    refinements = parse_refinements(initial_response)
    brands = refinements.get("Brand", [])
    
    # 3. 使用品牌进行优化搜索
    if brands:
        brand = brands[0]  # 选择第一个品牌
        refined_results = await refined_search(
            keywords="笔记本电脑",
            refinement={"Brand": brand["id"]}
        )
        return refined_results
```

### 3. 搜索优化最佳实践

1. 合理使用优化选项
```python
class SearchOptimizer:
    def __init__(self):
        self.refinement_cache = {}
        
    async def get_refinements(self, keywords: str, search_index: str):
        cache_key = f"{keywords}:{search_index}"
        if cache_key in self.refinement_cache:
            return self.refinement_cache[cache_key]
            
        response = await api.search_items(
            Keywords=keywords,
            SearchIndex=search_index,
            Resources=["SearchRefinements"]
        )
        
        refinements = parse_refinements(response)
        self.refinement_cache[cache_key] = refinements
        return refinements
        
    async def optimize_search(self, keywords: str, search_index: str, 
                            refinement_type: str = None):
        refinements = await self.get_refinements(keywords, search_index)
        
        if not refinement_type or refinement_type not in refinements:
            return await api.search_items(
                Keywords=keywords,
                SearchIndex=search_index
            )
            
        options = refinements[refinement_type]
        if not options:
            return None
            
        return await refined_search(
            keywords=keywords,
            refinement={refinement_type: options[0]["id"]}
        )
```

2. 优化建议
- 缓存常用的优化选项
- 根据用户行为选择合适的优化类型
- 提供多级优化选项
- 结合用户反馈调整优化策略

3. 注意事项
- 某些优化选项可能导致结果为空
- 优化选项的可用性因类目而异
- 需要处理优化失败的情况
- 考虑搜索结果的相关性

### 4. 实现示例

#### 通用搜索服务
```python
class SearchService:
    def __init__(self):
        self.optimizer = SearchOptimizer()
        
    async def search(self, keywords: str, search_index: str,
                    refinements: List[str] = None):
        """
        执行优化搜索
        
        :param keywords: 搜索关键词
        :param search_index: 搜索类目
        :param refinements: 优化类型列表
        :return: 搜索结果
        """
        try:
            # 1. 获取所有可用的优化选项
            available_refinements = await self.optimizer.get_refinements(
                keywords, search_index
            )
            
            # 2. 过滤有效的优化类型
            valid_refinements = [
                r for r in refinements or []
                if r in available_refinements
            ]
            
            # 3. 依次应用优化
            results = None
            for refinement in valid_refinements:
                results = await self.optimizer.optimize_search(
                    keywords, search_index, refinement
                )
                if results:
                    break
                    
            # 4. 如果所有优化都失败，返回原始搜索结果
            if not results:
                results = await api.search_items(
                    Keywords=keywords,
                    SearchIndex=search_index
                )
                
            return results
            
        except Exception as e:
            logger.error(f"搜索优化失败: {str(e)}")
            # 发生错误时返回基本搜索结果
            return await api.search_items(
                Keywords=keywords,
                SearchIndex=search_index
            )
```

使用示例：
```python
# 创建搜索服务
search_service = SearchService()

# 搜索图书
books = await search_service.search(
    keywords="python编程",
    search_index="Books",
    refinements=["Author", "Publisher"]
)

# 搜索电子产品
electronics = await search_service.search(
    keywords="笔记本电脑",
    search_index="Electronics",
    refinements=["Brand", "Price"]
)
```

## 参考文档

- [PA-API 5.0 文档](https://webservices.amazon.com/paapi5/documentation/)
- [快速入门指南](https://webservices.amazon.com/paapi5/documentation/quick-start/using-curl.html)
- [API操作和资源](https://webservices.amazon.com/paapi5/documentation/quick-start/operations-and-resources.html)
- [不使用SDK的开发](https://webservices.amazon.com/paapi5/documentation/without-sdk.html) 