# Javascript-Image-Magic sdk开发帮助
## 概述
JS版Image-magic sdk 是一个浏览器环境下高效完成图层图像替换、渲染的引擎。内部封装了图形图像的复杂处理。把模板文件和sdk想象成为psd文件和photoshop有助于理解。不熟悉photoshop也没关系，sdk已经把复杂的渲染过程封装起来了。暴露的对象、接口只有几个，即使一个前端的初学者也能很快掌握。

相关文档:

[Java服务端渲染SDK //TODO](#)

[Python torch大图像GPU高速渲染安装包 //TODO](#)

[IMGF文件协议 //TODO](#)

[ImageMagic管道渲染 //TODO](#)

[ImageMagic并行渲染 //TODO](#)


### Image-Magic嵌入到PC、手机端、PAD、小程序应用中

![Image-Magic PC](/assets/images/demos/PC_单张渲染_男.png)

![Image-Magic phone](/assets/images/demos/手机_系列.png)

![Image-Magic phone](/assets/images/demos/ipad_系列.png)


## 名词解释

|       名称               |      含义     |
|:------------------------|:------------------|
|   模板文件      |sdk可以读取的二进制文件，后缀名是imgf。SDK用它来渲染出图像。该文件记录了图像、图层、效果等。文件的形式也有利于方便管理和分发。       |
|      图层           | 一个复杂的图像由多个图层组成。每个图层包含一个图像和一组滤镜、形变、纹理等等效果。图层是有层次的。 图层有自己的名称和ID，方便开发检索。        |
|     替换           |  将图层里的图像换成其他图像，从而能够使用sdk渲染出新图的过程。        | 
|     渲染           |    SDK使用模板输出图像的过程      | 



## API 详解

### 1，核心对象
|       名称               |              含义           |
|:------------------------|:----------------------------|
| window.ImageMagicSDK    | 类型：对象。由SDK提供，加载SDK后自动载入到window对象上。主要作用是读取模板文件到内存、操作换图等。|
| window.ImageMagicSDK.LayerCompositor()    | 类型：构造函数。作用：图像的渲染管线，输出渲染图像的。通常一个模板对应一个渲染管线对象。它是有状态的，能够加速渲染。|
|ImageMagicDoc             |类型：对象。内存中的模板对象，通过ImageMagicSDK.readImageMagicFile(buffer) 获得。|
|Layer                     |类型：对象。图层，ImageMagicDoc上的layers属性的元素。|

ImageMagicDoc 对象关键属性：
|       名称               |              含义           |
|:------------------------|:----------------------------|
|  width、 height         | 图像大小，长宽：imageMagicDoc.width，imageMagicDoc.height   |
|  layers                 |layers 图层列表。次序从底层到最上层，也就是layer[0] 总是背景图。|
|  image                  |模板预览的图像。类型:canvas |

Layer 对象关键属性:

|       名称               |              含义           |
|:------------------------|:----------------------------|
|  id        | 唯一标识 数值。0、1、2、3等。id不总是从0开始，也不保证顺序递增，这和模板的加工设计过程相关。  |
|  layerName     |图层名称，文本。UFT-8编码的，英语、中文等都支持。|
|  visible       |图层是否可见，0/1。1是可见的，0不可见。不可见图层一般是模板渲染过程的中间物，我们将它留给设计师和渲染引擎，不要操作。|
|  sourceImage    |源图像，类型Canvas。原图像的大小就是sourceImage.width,sourceImage.height。|




### 2，API 详解

1.  读取模板文件：

    ```javascript
    ImageMagicSDK.readImageMagicFile(buffer);
    ```

    *   **功能**：将模板文件的二进制数据读取到内存中，生成 `ImageMagicDoc` 对象。
    *   **参数**：
        *   `buffer`：`ArrayBuffer` 对象，包含模板文件的二进制数据。
    *   **返回值**：`Promise<ImageMagicDoc>`，一个 Promise 对象，resolve 的值为 `ImageMagicDoc` 对象。

    *   **示例**：
    ```javascript
    //示例一， 从URL加载
    fetch(url,{cache:"force-cache"})
           //读取HTTP 响应
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.arrayBuffer();
            })
            // 从响应中读取 模板文件二进制数据
            .then(buffer => {
                console.log('[URL-Load] 获取到二进制数据:', buffer.byteLength, 'bytes');
                return ImageMagicSDK.readImageMagicFile(buffer);
            })
            //返回 模板文件
            .then(imageMagicDoc => {
                console.log('[URL-Load] 解析ImageMagicFile成功');
            })
            .catch(error => {
                console.error('[URL-Load-Error]', error);
                displayMessage('加载失败：' + error.message, true);
            });

    //示例2， 从本地文件加载  
    //templateFile为HTML文件输入元素  <input type="file" id="templateFile"/>
    const fileInput = document.getElementById('templateFile');
    const file = fileInput.files[0];

    file.arrayBuffer()
            .then(buffer => ImageMagicSDK.readImageMagicFile(buffer))
            .then(imageMagicDoc => {
                console.log('[file-Load] 解析ImageMagicFile成功');
                console.log('[file-Load] 图像大小:width:${imageMagicDoc.width},height:${imageMagicDoc.height}');

                //TODO 将imageMagicDoc 放在渲染管线里在频繁的需要渲染的场景下可以大量节约计算
                //window.compositor = new ImageMagicSDK.LayerCompositor();
                //compositor.setDocument(imageMagicDoc)

            })
            .catch(error => {
                console.error('[File-Load-Error]', error);
                displayMessage('加载失败：' + error.message, true);
            });
    ```
2.  读取各层信息

    ```javascript
    const layersList = imageMagicDoc.layers||[];

    //倒序展示层信息 因为 图层有层次的，第一个层总是“背景层”，
    //我们总是想让最上面的图层显示在最前面
    //特别注意：不要直接reverse 原图层列表（layersList.reverse()），这将影响DOC原结构，结果不可预知
    //无论何时，总应该写无副作用的代码
    ////过滤掉隐藏图层
    const displayLayers = [...layersList]
                            .reverse()
                            .filter(layer => layer.visible);

    displayLayers.forEach(layer)=> {
            const layerId = layer.id;
            const layerName = layer.layerName;
            //js中layerSourceImage 是个canvas类型
            const layerSourceImage = layer.sourceImage;
            //图层原图的大小
            const width = layerSourceImage ? layerSourceImage.width : 0;
            const height = layerSourceImage ? layerSourceImage.height : 0;
            console.log(`图层: 名称=${layerName},ID:${id},长宽:${width},${height}`);

    ```

2.  替换图层原图像
    ```javascript

    //本地或URL 读取文件或二进制数据
    const newImagefile = fileInput.files[0];

    //newImagefile 要求是个图像数据。来源本地文件(File对象、网络流、数据库或其他存储形式)
    //图像格式：浏览器能识别的格式、PNG、BitMap、Jpg、webp等等
    //支持的Dom类型:Canvas:HTMLCanvasElement \Blob\File\ArrayBuffer\Uint8Array
    // 返回值  Promise<Void>


    //覆盖（Cover）：保持比例缩放以“充满”目标框，超出部分将被裁剪，构图更饱满。
    ImageMagicSDK.replaceCover(layer,newImagefile);

    //适配（Contain）：保持比例缩放以“完整显示”候选图，不裁剪但可能留边。
    ImageMagicSDK.replaceContain(layer,newImagefile);

    //拉伸（Exact）：不保持比例强制填满目标框，不留边也不裁剪，但会形变。
    ImageMagicSDK.replaceExact(layer,newImagefile);
   
    //replaceCover 自动缩放总是第一选项，保证了不变形又能覆盖。
    //replaceContain 贴图完整，但可能无法充满原图层图像的空间，即可能留边
    //replaceExact 变形的选项一般不用
    //经验:最好是能够在传入前加工好 至少长宽比例等于或接近原图层的图像
    //其他更有创造力的方式，比如 截取新图的AABB/BBox，
    //甚至调颜色、对比度、透明度、光照等等，请在SDK外面加工好

    ```



3.  渲染出新图像

    ```javascript
    const compositor = new ImageMagicSDK.LayerCompositor();
    //循环多次渲染 就这样用：compositor.setDocument(imageMagicDoc)
    //在完成对图层替换后使用渲染管线输出新的图像
    // renderedCanvas  是个canvas对象 
    // 他的大小就是renderedCanvas.width renderedCanvas.heigh 
    // 该函数是同步的函数 返回值就是正常的canvas
    const renderedCanvas = compositor.renderToCanvas(imageMagicDoc);

    //缩放显示 displayCanvas 是显示渲染结果定义的 <canvas  id="displayCanvas"/>
    drawScaledImage(renderedCanvas, displayCanvas);

    ```


4. 辅助函数 绘制到目标Canvas
    ```javascript
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
    ```

5. 辅助代码 定位/查找图层

   ```javascript
    const layersList = imageMagicDoc.layers||[];

    //查找1个图层
    layersList.find((layer)=>layer.id===${1})  ///${1} 为示例代码
    layersList.find((layer)=>layer.LayerName===${name})  ///${name}为示例代码


    //查找多个图层 ：注意 允许layer图层重名。
    //使用多个相同名称的图层构成图像时比如照镜子的人。
    //镜子内外就可以使用相同名称的图层，这给图层替换带来了方便
    const layers  = layersList.filter((layer) => layer.LayerName===${name})

    ```





### 3，快速上手

下面的这个HTML 代码可以直接复制下来使用。
注意,生产中基本上不需要分解图层，直接替换图层图像就好了。


1.  读取模板
2.  预览模板
3.  分解图层
4.  替换图层源图像
5.  渲染出新图

示例模板(可下载到本地):
[长裙\_滑\_舞蹈\_small\_800花纹.imgf](/assets/models/girls/长裙_滑_舞蹈_small_800花纹.imgf)



```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>模板编辑器</title>
    <!--script  src ="/assets/sdk/image-magic-sdk_v22.8.15.js" ></script -->
    <script  src ="https://www.image-magic.cn/assets/sdk/image-magic-sdk_read_v24.17.15.js" ></script>

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5em;
        }

        .main-content {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
        }

        .section {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .section h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }

        .input-group {
            margin-bottom: 20px;
        }

        .input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
        }

        .input-row {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        input[type="file"] {
            display: none;
        }

        input[type="url"], input[type="text"], input[type="number"] {
            flex: 1;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
        }

        input[type="url"]:focus, input[type="text"]:focus, input[type="number"]:focus {
            outline: none;
            border-color: #007bff;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            transition: background-color 0.3s;
        }

        .btn-primary {
            background-color: #007bff;
            color: white;
        }

        .btn-primary:hover {
            background-color: #0056b3;
        }

        .btn-success {
            background-color: #28a745;
            color: white;
        }

        .btn-success:hover {
            background-color: #1e7e34;
        }

        .btn-warning {
            background-color: #ffc107;
            color: #212529;
        }

        .btn-warning:hover {
            background-color: #e0a800;
        }

        .canvas-container {
            border: 2px dashed #ddd;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            background-color: #f9f9f9;
        }

        canvas {
            border: 1px solid #ccc;
            border-radius: 5px;
            background-color: white;
        }

        .layer-item {
            border: 2px solid #e9ecef;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            background-color: #f8f9fa;
        }

        .layer-properties {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .layer-preview {
            margin-bottom: 15px;
        }

        .layer-preview label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
        }

        .render-result {
            background: white;
            border-radius: 10px;
            padding: 25px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .render-canvas-container {
            border: 2px solid #007bff;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            background-color: #f8f9ff;
        }

        .status-message {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-size: 14px;
        }

        .status-success {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status-error {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }

            .layer-properties {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
<div class="container">
    <h1>模板编辑器</h1>

    <div class="main-content">
        <!-- 左侧：模板输入和预览 -->
        <div>
            <!-- 模板输入区域 -->
            <div class="section">
                <h2>模板输入区域</h2>

                <!-- 本地文件输入 -->
                <div class="input-group">
                    <label>本地文件</label>
                    <div class="input-row">
                        <input type="file" id="templateFile" accept=".imgf,.IMGF,.template">
                        <button class="btn btn-primary" onclick="selectTemplateFile()">选择文件</button>
                        <button class="btn btn-success" onclick="loadTemplateFile()">确定</button>
                    </div>
                </div>

                <!-- URL输入 -->
                <div class="input-group">
                    <label>URL地址</label>
                    <div class="input-row">
                        <input type="url" id="templateUrl" placeholder="请输入图片URL地址">
                        <button class="btn btn-success" onclick="loadTemplateUrl()">确定</button>
                    </div>
                </div>

                <!-- 状态消息 -->
                <div id="statusMessage"></div>
            </div>

            <!-- 模板预览框 -->
            <div class="section">
                <h2>模板预览框</h2>
                <div class="canvas-container">
                    <canvas id="templateCanvas" width="400" height="300"></canvas>
                </div>
            </div>
        </div>

        <!-- 中间：图层区域 -->
        <div class="section">
            <h2>图层区域</h2>
            <div id="layersContainer">
                <!-- 图层将通过JavaScript动态生成 -->
            </div>
        </div>

        <!-- 右侧：渲染结果 -->
        <div class="render-result">
            <h2>渲染结果</h2>
            <div id="render-canvas-container" class="render-canvas-container">
                <canvas id="renderCanvas" width="400" height="300"></canvas>
            </div>
            <div style="margin-top: 15px; text-align: center;">
                <button class="btn btn-primary" onclick="renderResult()">生成渲染结果</button>
            </div>
        </div>
    </div>
</div>

<script>
    // 应用状态管理
    const AppState = {
        SDK: null,
        compositor: null,
        imageMagicDoc: null,
        fileName: null
    };

    // 初始化SDK
    function initializeSDK() {
        AppState.SDK = window.ImageMagicSDK;
        AppState.compositor = new AppState.SDK.LayerCompositor();
    }

    // 状态消息管理
    function displayMessage(message, isError = false) {
        const statusDiv = document.getElementById('statusMessage');
        statusDiv.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
        statusDiv.textContent = message;

        setTimeout(() => {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 3000);
    }

    // 页面初始化
    document.addEventListener('DOMContentLoaded', function() {
        initializeSDK();
        setupEmptyCanvas('templateCanvas', '模板预览区域', '#f3f4f6', '#9ca3af');
        setupEmptyCanvas('renderCanvas', '渲染结果显示区域', '#f8f9ff', '#007bff');
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

    // 文件选择处理
    function selectTemplateFile() {
        document.getElementById('templateFile').click();
    }

    // 模板文件加载
    function loadTemplateFile() {
        const fileInput = document.getElementById('templateFile');
        const file = fileInput.files[0];

        if (!file) {
            displayMessage('请先选择文件', true);
            return;
        }

        displayMessage('正在加载模板文件...');

        file.arrayBuffer()
            .then(buffer => AppState.SDK.readImageMagicFile(buffer))
            .then(document => processLoadedDocument(document, file.name))
            .catch(error => {
                console.error('[Load-Error]', error);
                displayMessage('读取失败：' + error.message, true);
            });
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

        displayLayers.forEach((layer, displayIndex) => {
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
    function loadTemplateUrl() {
        const urlInput = document.getElementById('templateUrl');
        const url = urlInput.value.trim();

        if (!url) {
            displayMessage('请输入有效的URL地址', true);
            return;
        }

        displayMessage('正在加载模板文件...');

        // 使用 fetch 加载二进制文件
        fetch(url)
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
                return processLoadedDocument(imageMagicDoc, `URL: ${url}`);
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
</script>
</body>
</html>

```





