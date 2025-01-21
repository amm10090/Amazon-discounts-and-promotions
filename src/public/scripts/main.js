// API配置对象
const API_CONFIG = {
    'deals': {
        method: 'GET',
        path: '/api/v1/products/deals',
        params: []
    },
    'product-details': {
        method: 'GET',
        path: '/api/v1/products/:asin',
        params: [
            { name: 'asin', type: 'string', required: true, placeholder: '商品ASIN' }
        ]
    },
    'variations': {
        method: 'GET',
        path: '/api/v1/products/:asin/variations',
        params: [
            { name: 'asin', type: 'string', required: true, placeholder: '商品ASIN' }
        ]
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const languageSelect = document.getElementById('language');
    const loadingElement = document.getElementById('loading');
    const resultsContainer = document.getElementById('results');
    const productModal = new bootstrap.Modal(document.getElementById('productModal'));
    const testModal = new bootstrap.Modal(document.getElementById('testModal'));
    let currentApiType = '';

    // 语言切换
    languageSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        fetch(`/api/v1/language/${lang}`, { method: 'POST' })
            .then(() => window.location.reload());
    });

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 代码高亮
    Prism.highlightAll();

    // API测试功能
    window.testAPI = (type) => {
        currentApiType = type;
        const config = API_CONFIG[type];
        if (!config) {
            alert('未知的API类型');
            return;
        }

        // 动态生成参数输入表单
        const paramsContainer = document.getElementById('testParams');
        paramsContainer.innerHTML = '';
        
        config.params.forEach(param => {
            const div = document.createElement('div');
            div.className = 'mb-3';
            div.innerHTML = `
                <label class="form-label">${param.name}${param.required ? ' *' : ''}</label>
                <input type="${param.type === 'number' ? 'number' : 'text'}" 
                       class="form-control" 
                       name="${param.name}"
                       placeholder="${param.placeholder}"
                       ${param.required ? 'required' : ''}>
            `;
            paramsContainer.appendChild(div);
        });

        testModal.show();
    };

    // 执行API测试
    window.runTest = async () => {
        const config = API_CONFIG[currentApiType];
        if (!config) {
            alert('未知的API类型');
            return;
        }

        // 收集参数
        const params = {};
        const inputs = document.querySelectorAll('#testParams input');
        inputs.forEach(input => {
            if (input.value) {
                params[input.name] = input.value;
            }
        });

        // 验证必填参数
        const missingParams = config.params
            .filter(p => p.required && !params[p.name])
            .map(p => p.name);
            
        if (missingParams.length > 0) {
            alert(`缺少必填参数: ${missingParams.join(', ')}`);
            return;
        }

        const resultElement = document.getElementById('testResult');
        try {
            // 构建URL
            let url = config.path;
            
            // 替换路径参数
            Object.keys(params).forEach(key => {
                url = url.replace(`:${key}`, params[key]);
            });
            
            // 添加查询参数
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (!url.includes(`:${key}`)) {
                    queryParams.append(key, params[key]);
                }
            });
            
            if (queryParams.toString()) {
                url += `?${queryParams.toString()}`;
            }

            // 发送请求
            const response = await fetch(url, {
                method: config.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            resultElement.textContent = JSON.stringify(data, null, 2);
            Prism.highlightElement(resultElement);
        } catch (error) {
            resultElement.textContent = JSON.stringify({
                status: 'error',
                message: error.message
            }, null, 2);
            Prism.highlightElement(resultElement);
        }
    };

    // 复制代码按钮
    document.querySelectorAll('pre code').forEach((block) => {
        const button = document.createElement('button');
        button.className = 'btn btn-sm btn-outline-secondary copy-button';
        button.textContent = '复制';
        button.style.position = 'absolute';
        button.style.right = '1rem';
        button.style.top = '0.5rem';

        const pre = block.parentNode;
        pre.style.position = 'relative';
        pre.insertBefore(button, block);

        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(block.textContent);
                button.textContent = '已复制!';
                setTimeout(() => {
                    button.textContent = '复制';
                }, 2000);
            } catch (err) {
                console.error('复制失败:', err);
                button.textContent = '复制失败';
            }
        });
    });

    // 搜索表单提交
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const keywords = document.getElementById('keywords').value;
        const searchIndex = document.getElementById('searchIndex').value;

        showLoading();
        try {
            const response = await fetch(`/api/v1/products/search?keywords=${encodeURIComponent(keywords)}&searchIndex=${searchIndex}`);
            const data = await response.json();

            if (data.status === 'success') {
                displayResults(data.data.products);
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('搜索时发生错误，请稍后重试');
        } finally {
            hideLoading();
        }
    });

    // 显示搜索结果
    function displayResults(products) {
        resultsContainer.innerHTML = products.map(product => `
            <div class="col-md-4 mb-4">
                <div class="card product-card">
                    <img src="${product.image}" 
                         class="card-img-top product-image p-3" 
                         alt="${product.title}">
                    <div class="card-body">
                        <h5 class="card-title text-truncate">${product.title}</h5>
                        <div class="price-info mb-2">
                            <span class="price">${product.price}</span>
                            ${product.priceDetails?.pricePerUnit ? `
                                <div class="price-per-unit small text-muted">
                                    ${product.priceDetails.pricePerUnit}
                                </div>
                            ` : ''}
                            ${product.priceDetails?.savings ? `
                                <span class="savings text-success">
                                    (节省 ${product.priceDetails.savings.displayAmount}${product.priceDetails.savings.percentage ? ` / ${product.priceDetails.savings.percentage}%` : ''})
                                </span>
                            ` : ''}
                            ${product.priceDetails?.savingBasis ? `
                                <div class="saving-basis small text-muted">
                                    ${product.priceDetails.savingBasis.label}: ${product.priceDetails.savingBasis.displayAmount}
                                </div>
                            ` : ''}
                            ${product.offerSummary ? `
                                <div class="offer-summary small text-muted">
                                    ${product.offerSummary.offerCount ? `${product.offerSummary.offerCount}个商家报价` : ''}
                                    ${product.offerSummary.lowestPrice ? `，最低价: $${product.offerSummary.lowestPrice}` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="product-info small text-muted mb-2">
                            ${product.merchant ? `
                                <div class="merchant">
                                    卖家: ${product.merchant}
                                    ${product.isPrimeEligible ? '<span class="badge bg-primary ms-2">Prime</span>' : ''}
                                    ${product.isBuyBoxWinner ? '<span class="badge bg-success ms-1">Best Price</span>' : ''}
                                    ${product.isAmazonFulfilled ? '<span class="badge bg-info ms-1">亚马逊发货</span>' : ''}
                                    ${product.isFreeShipping ? '<span class="badge bg-secondary ms-1">免运费</span>' : ''}
                                </div>
                            ` : ''}
                            ${product.condition ? `
                                <div class="condition">
                                    商品状态: ${product.condition}
                                    ${product.conditionNote ? `<span class="text-muted">- ${product.conditionNote}</span>` : ''}
                                </div>
                            ` : ''}
                            ${product.availability ? `
                                <div class="availability">
                                    库存状态: ${product.availability.message || product.availability.type || '未知'}
                                    ${product.availability.maxOrderQuantity ? `<br>最大购买数量: ${product.availability.maxOrderQuantity}` : ''}
                                </div>
                            ` : ''}
                            ${product.programEligibility?.isPrimeExclusive ? `
                                <div class="program-eligibility">
                                    <span class="badge bg-warning text-dark">Prime专享</span>
                                </div>
                            ` : ''}
                            ${product.dealDetails ? `
                                <div class="deal-details mt-2">
                                    <span class="badge bg-danger">限时特惠</span>
                                    ${product.dealDetails.percentClaimed ? `
                                        <div class="progress mt-1" style="height: 5px;">
                                            <div class="progress-bar bg-danger" 
                                                 role="progressbar" 
                                                 style="width: ${product.dealDetails.percentClaimed}%">
                                            </div>
                                        </div>
                                        <small>已抢购${product.dealDetails.percentClaimed}%</small>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <a href="${product.url}" 
                           class="btn btn-primary mt-2" 
                           target="_blank">查看详情</a>
                        <button class="btn btn-outline-primary mt-2 ms-2"
                                onclick="showProductDetails('${product.asin}')">
                            更多信息
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 显示商品详情
    window.showProductDetails = async (asin) => {
        showLoading();
        try {
            const response = await fetch(`/api/v1/products/${asin}`);
            const data = await response.json();

            if (data.status === 'success') {
                const product = data.data.product;
                document.getElementById('productDetails').innerHTML = `
                    <div class="row">
                        <div class="col-md-6">
                            <img src="${product.image}" 
                                 class="img-fluid" 
                                 alt="${product.title}">
                        </div>
                        <div class="col-md-6">
                            <h4>${product.title}</h4>
                            <div class="price-info mb-3">
                                <div class="price h5">${product.price}</div>
                                ${product.priceDetails?.pricePerUnit ? `
                                    <div class="price-per-unit text-muted">
                                        ${product.priceDetails.pricePerUnit}
                                    </div>
                                ` : ''}
                                ${product.priceDetails?.savings ? `
                                    <div class="savings text-success">
                                        节省: ${product.priceDetails.savings.displayAmount}
                                        ${product.priceDetails.savings.percentage ? ` (${product.priceDetails.savings.percentage}%)` : ''}
                                    </div>
                                ` : ''}
                                ${product.priceDetails?.savingBasis ? `
                                    <div class="saving-basis text-muted">
                                        ${product.priceDetails.savingBasis.label}: ${product.priceDetails.savingBasis.displayAmount}
                                    </div>
                                ` : ''}
                                ${product.offerSummary ? `
                                    <div class="offer-summary text-muted">
                                        ${product.offerSummary.offerCount ? `${product.offerSummary.offerCount}个商家报价` : ''}
                                        ${product.offerSummary.lowestPrice ? `<br>最低价: $${product.offerSummary.lowestPrice}` : ''}
                                        ${product.offerSummary.highestPrice ? `<br>最高价: $${product.offerSummary.highestPrice}` : ''}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="product-details mb-3">
                                ${product.merchant ? `
                                    <div class="merchant mb-2">
                                        <strong>卖家:</strong> ${product.merchant}
                                        <div class="badges">
                                            ${product.isPrimeEligible ? '<span class="badge bg-primary me-1">Prime</span>' : ''}
                                            ${product.isBuyBoxWinner ? '<span class="badge bg-success me-1">Best Price</span>' : ''}
                                            ${product.isAmazonFulfilled ? '<span class="badge bg-info me-1">亚马逊发货</span>' : ''}
                                            ${product.isFreeShipping ? '<span class="badge bg-secondary me-1">免运费</span>' : ''}
                                        </div>
                                    </div>
                                ` : ''}
                                ${product.condition ? `
                                    <div class="condition mb-2">
                                        <strong>商品状态:</strong> ${product.condition}
                                        ${product.conditionNote ? `<br><small class="text-muted">${product.conditionNote}</small>` : ''}
                                    </div>
                                ` : ''}
                                ${product.availability ? `
                                    <div class="availability mb-2">
                                        <strong>库存状态:</strong> ${product.availability.message || product.availability.type || '未知'}
                                        ${product.availability.maxOrderQuantity ? `<br>最大购买数量: ${product.availability.maxOrderQuantity}` : ''}
                                        ${product.availability.minOrderQuantity ? `<br>最小购买数量: ${product.availability.minOrderQuantity}` : ''}
                                    </div>
                                ` : ''}
                                ${product.programEligibility ? `
                                    <div class="program-eligibility mb-2">
                                        <strong>购买资格:</strong>
                                        ${product.programEligibility.isPrimeExclusive ? '<br><span class="badge bg-warning text-dark">Prime专享</span>' : ''}
                                        ${product.programEligibility.isPrimePantry ? '<br><span class="badge bg-info">Prime Pantry</span>' : ''}
                                    </div>
                                ` : ''}
                                ${product.promotions && product.promotions.length > 0 ? `
                                    <div class="promotions mb-2">
                                        <strong>促销信息:</strong>
                                        <ul class="list-unstyled">
                                            ${product.promotions.map(promo => `
                                                <li>
                                                    <span class="badge bg-success">${promo.type}</span>
                                                    ${promo.description ? ` - ${promo.description}` : ''}
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                                ${product.dealDetails ? `
                                    <div class="deal-details mb-2">
                                        <strong>特惠信息:</strong>
                                        <div class="mt-2">
                                            <span class="badge bg-danger">限时特惠</span>
                                            ${product.dealDetails.accessType === 'PRIME_EXCLUSIVE' ? '<span class="badge bg-warning text-dark ms-1">Prime专享</span>' : ''}
                                            ${product.dealDetails.startTime ? `<br>开始时间: ${new Date(product.dealDetails.startTime).toLocaleString()}` : ''}
                                            ${product.dealDetails.endTime ? `<br>结束时间: ${new Date(product.dealDetails.endTime).toLocaleString()}` : ''}
                                            ${product.dealDetails.percentClaimed ? `
                                                <div class="progress mt-2" style="height: 5px;">
                                                    <div class="progress-bar bg-danger" 
                                                         role="progressbar" 
                                                         style="width: ${product.dealDetails.percentClaimed}%">
                                                    </div>
                                                </div>
                                                <small>已抢购${product.dealDetails.percentClaimed}%</small>
                                            ` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                            <a href="${product.url}" 
                               class="btn btn-primary mt-3" 
                               target="_blank">
                                在亚马逊上查看
                            </a>
                        </div>
                    </div>
                `;
                productModal.show();
            } else {
                showError(data.message);
            }
        } catch (error) {
            showError('获取商品详情时发生错误');
        } finally {
            hideLoading();
        }
    };

    // 工具函数
    function showLoading() {
        loadingElement.classList.remove('d-none');
    }

    function hideLoading() {
        loadingElement.classList.add('d-none');
    }

    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    ${message}
                </div>
            </div>
        `;
    }
}); 