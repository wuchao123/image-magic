  // 应用状态管理
    const AppState = {
        SDK: null,
        compositor: null,
        imageMagicDoc: null,
        fileName: null,
    };

     // 初始化SDK
    function initializeSDK() {
        AppState.SDK = window.ImageMagicSDK;
        AppState.compositor = new AppState.SDK.LayerCompositor();
    }

    //初始装载模板
    function initializeTemplate() {

        const page_title = window.DEMO_CONDIG.page_title || "Image Magic在线演示";

        document.title = page_title;
        document.getElementById('pageTitle').textContent = page_title;

        const file_url  = window.DEMO_CONDIG.demo_file_url;
        if (file_url) {
            loadTemplateUrl(file_url);
            document.getElementById('template_file_url').textContent = file_url;
        } else {
            displayMessage('请提供有效的模板文件URL', true);
        }
    }
    

    // 状态消息管理
    function displayMessage(message, isError = false) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
        statusDiv.textContent = message;

        /*
        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
        */
    }

    // 页面初始化
    document.addEventListener('DOMContentLoaded', function() {
        initializeSDK();
        setupEmptyCanvas('templateCanvas', '模板预览区域', '#f3f4f6', '#9ca3af');
        setupEmptyCanvas('renderCanvas', '渲染结果显示区域', '#f8f9ff', '#007bff');
        initializeTemplate();
    });



    // 设置空白画布
    function setupEmptyCanvas(canvasId, text, bgColor, textColor) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = textColor;
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    // 处理加载的文档
    async function processLoadedDocument(imageMagicDoc, fileName) {
        try {
            AppState.imageMagicDoc = imageMagicDoc;
            AppState.fileName = fileName;

            const layers = imageMagicDoc.layers || [];
            console.log("[Document] 加载完成:", {
                name: fileName,
                size: `${imageMagicDoc.width}x${imageMagicDoc.height}`,
                layerCount: layers.length
            });

            logLayerOrder(layers);
            AppState.compositor.setDocument(imageMagicDoc);

            await updatePreviewCanvas(imageMagicDoc);
            renderLayerUI(layers);
            performInitialRender();

            displayMessage(`模板加载成功！包含 ${layers.length} 个图层`);

        } catch (error) {
            console.error('[Process-Error]', error);
            displayMessage('加载文档失败：' + error.message, true);
        }
    }

    // 记录图层顺序
    function logLayerOrder(layers) {
        console.log("[Layers] 图层顺序（底层到顶层）:");
        layers.forEach((layer, index) => {
            console.log(`  ${index}: ID=${layer.id}, Name="${layer.layerName}", Visible=${layer.visible}`);
        });
    }

    // 更新预览画布
    async function updatePreviewCanvas(imageMagicDoc) {
        console.log("[Preview] 生成预览图像...");
        const previewCanvas = getDocumentPreview(imageMagicDoc);
        const targetCanvas = document.getElementById('templateCanvas');
        await drawScaledImage(previewCanvas, targetCanvas);
        console.log("[Preview] 预览图像完成");
    }

    // 获取文档预览
    function getDocumentPreview(imageMagicDoc) {
        return imageMagicDoc.image || AppState.compositor.renderToCanvas(imageMagicDoc);
    }

    // 缩放绘制图像
    async function drawScaledImage(sourceCanvas, targetCanvas) {
        const sourceWidth = sourceCanvas.width;
        const sourceHeight = sourceCanvas.height;
        const targetWidth = targetCanvas.width;
        const targetHeight = targetCanvas.height;

        const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
        ctx.clearRect(0, 0, targetWidth, targetHeight);

        const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
        const scaledWidth = Math.max(1, Math.round(sourceWidth * scale));
        const scaledHeight = Math.max(1, Math.round(sourceHeight * scale));
        const offsetX = Math.round((targetWidth - scaledWidth) / 2);
        const offsetY = Math.round((targetHeight - scaledHeight) / 2);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sourceCanvas, offsetX, offsetY, scaledWidth, scaledHeight);
    }

    // 渲染图层UI
    function renderLayerUI(layers) {
        const container = document.getElementById('layersContainer');
        container.innerHTML = '';

        console.log("[UI] 渲染图层界面（顶层在上显示）:");
        const displayLayers = [...layers].reverse();

        const backgroundLayer = AppState.imageMagicDoc.backGroundLayer||null;

        //过滤掉隐藏图层 和背景图层
        const filteredLayers = displayLayers.filter(layer => layer.visible && layer !== backgroundLayer);

        filteredLayers.forEach((layer, displayIndex) => {
            const originalIndex = layers.length - 1 - displayIndex;
            console.log(`[UI] 图层UI: 显示=${displayIndex}, 原始=${originalIndex}, ID=${layer.id}, Name="${layer.layerName}"`);

            const layerElement = createLayerUI(layer);
            container.appendChild(layerElement);
            setupLayerCanvas(layer);
        });
    }

    // 创建图层UI元素
    function createLayerUI(layer) {
        const width = layer.sourceImage ? layer.sourceImage.width : 0;
        const height = layer.sourceImage ? layer.sourceImage.height : 0;

        const div = document.createElement('div');
        div.className = 'layer-item';
        div.innerHTML = `
            <div class="layer-properties">
                <div><label>图层名: ${layer.layerName || '未命名'}</label></div>
                <div><label>宽度: ${width}</label></div>
                <div><label>高度: ${height}</label></div>
            </div>
            <div class="layer-preview">
                <label>图像预览</label>
                <canvas id="layerCanvas_${layer.id}" width="120" height="120"></canvas>
            </div>
            <input type="file" id="layerFile${layer.id}" accept="image/*" style="display: none;" onchange="handleLayerImageChange(${layer.id}, this)">
            <button class="btn btn-warning" onclick="triggerLayerImageSelect(${layer.id})">替换图像</button>
        `;

        return div;
    }

    // 设置图层画布
    function setupLayerCanvas(layer) {
        const canvas = document.getElementById(`layerCanvas_${layer.id}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (layer.sourceImage) {
            drawScaledImage(layer.sourceImage, canvas);
        } else {
            drawPlaceholder(ctx, canvas.width, canvas.height);
        }
    }

    // 绘制占位符
    function drawPlaceholder(ctx, width, height) {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#d1d5db';
        ctx.strokeRect(0, 0, width, height);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('无图像', width / 2, height / 2);
    }

    // URL模板加载
    function loadTemplateUrl(fileUrl) {
       
        if (!fileUrl) {
            displayMessage('请输入有效的URL地址', true);
            return;
        }

        displayMessage('正在加载模板文件...');

        // 使用 fetch 加载二进制文件
        fetch(fileUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            .then(buffer => {
                console.log('[URL-Load] 获取到二进制数据:', buffer.byteLength, 'bytes');
                return AppState.SDK.readImageMagicFile(buffer);
            })
            .then(imageMagicDoc => {
                console.log('[URL-Load] 解析ImageMagicFile成功');
                return processLoadedDocument(imageMagicDoc, `URL: ${fileUrl}`);
            })
            .then(() => {
                displayMessage('URL模板文件加载成功');
            })
            .catch(error => {
                console.error('[URL-Load-Error]', error);
                displayMessage('加载失败：' + error.message, true);
            });
    }


    // 触发图层图像选择
    function triggerLayerImageSelect(layerId) {
        document.getElementById(`layerFile${layerId}`).click();
    }

    // 处理图层图像变更
    function handleLayerImageChange(layerId, fileInput) {
        const file = fileInput.files[0];
        if (!file) return;

        if (!AppState.imageMagicDoc) {
            displayMessage('请先加载模板文件', true);
            return;
        }

        console.log(`[Replace] 开始替换: LayerID=${layerId}, File=${file.name}`);
        displayMessage('正在替换图层图像...');

        const layer = findLayerById(layerId);
        if (!layer) {
            console.error(`[Replace] 未找到图层: LayerID=${layerId}`);
            displayMessage('未找到指定图层', true);
            return;
        }

        console.log(`[Replace] 目标图层: Name="${layer.layerName}", ID=${layer.id}`);
        replaceLayerImage(layer, file);
    }

    // 查找图层
    function findLayerById(layerId) {
        return AppState.imageMagicDoc.layers.find(layer => layer.id === layerId);
    }

    // 替换图层图像
    function replaceLayerImage(layer, file) {
        AppState.SDK.replaceCover(layer, file)
            .then(() => {
                console.log(`[Replace] 替换成功: LayerID=${layer.id}`);

                console.log(`[UI] 更新预览: LayerID=${layer.id}`);
                setupLayerCanvas(layer);

                console.log(`[Cache] 清除缓存: LayerID=${layer.id}`);
                AppState.compositor.invalidateLayer(layer);
                //requestAnimationFrame 优化浏览器显示
                requestAnimationFrame(() => {
                    updateAfterReplacement(layer);
                });
            })
            .catch(error => {
                console.error("[Replace-Error]", error);
                displayMessage('替换图层图像失败：' + error.message, true);
            });
    }

    // 替换后更新
    function updateAfterReplacement(layer) {
        try {
            console.log(`[Render] 开始更新渲染...`);
            performFinalRender();
            console.log(`[Render] 渲染结果更新完成`);

            displayMessage(`图层 "${layer.layerName}" 图像替换成功`);
        } catch (error) {
            console.error("[Update-Error]", error);
            displayMessage('渲染更新失败：' + error.message, true);
        }
    }

    // 执行初始渲染
    function performInitialRender() {
        console.log("[Render] 开始初始渲染...");
        performFinalRender();
    }

    // 执行最终渲染
    function performFinalRender() {
        if (!AppState.imageMagicDoc || !AppState.compositor) {
            displayMessage('请先加载模板文件', true);
            return;
        }

        try {
            console.log("[Render] 开始最终渲染...");
            logDocumentInfo();
            logLayerStates();

            const startTime = performance.now();
            const resultCanvas = AppState.compositor.renderToCanvas(AppState.imageMagicDoc);
            const renderTime = performance.now() - startTime;

            console.log("[Compositor] 渲染完成:", {
                size: `${resultCanvas.width}x${resultCanvas.height}`,
                time: renderTime.toFixed(2) + 'ms'
            });

            const displayCanvas = document.getElementById('renderCanvas');
            const ctx = displayCanvas.getContext('2d', { willReadFrequently: true });

            console.log("[Display] 绘制到显示画布...");
            ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            drawScaledImage(resultCanvas, displayCanvas);

            console.log("[Display] 渲染流程完成");

        } catch (error) {
            console.error("[Render-Error]", error);
            displayMessage('渲染失败：' + error.message, true);
        }
    }

    // 记录文档信息
    function logDocumentInfo() {
        console.log("[Document] 渲染信息:", {
            size: `${AppState.imageMagicDoc.width}x${AppState.imageMagicDoc.height}`,
            layerCount: AppState.imageMagicDoc.layers ? AppState.imageMagicDoc.layers.length : 0
        });
    }

    // 记录图层状态
    function logLayerStates() {
        if (AppState.imageMagicDoc.layers) {
            console.log("[Layers] 渲染状态检查（底层到顶层）:");
            AppState.imageMagicDoc.layers.forEach((layer, index) => {
                console.log(`  [${index}] ID=${layer.id}, Name="${layer.layerName}", Visible=${layer.visible}, HasImage=${!!layer.sourceImage}`);
                if (layer.sourceImage) {
                    console.log(`      Size=${layer.sourceImage.width}x${layer.sourceImage.height}`);
                }
            });
        }
    }

    // 渲染结果（按钮触发）
    function renderResult() {
        performFinalRender();
    }
