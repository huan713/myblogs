# Element-UI上传组件扩展

## 前言
在Element-UI 的upload上传组件是不支持IE9的，因为该组件使用了很多H5特有的API，比如`FormData`对象。但是基于一些业务需要，需要在IE9上实现上传功能，好像没有什么办法可以直接修改原组件，所以这里开发了一个能够兼容IE9的上传组件。  

## 上传组件的要点和难点
首先，上传最重要的一步就是将文件数据流发送给服务器。在原upload组件中，采用的是`FormData`对象获取，但是`FormData`仅支持IE10及其以上。还有一种方式是使用form表单源生的`submit`事件自动获取表单元素的数据。这样一来，原组件的那套html模板结构就不能用了。  
还有一个难点在于，上传完成后，怎么接收从服务器返回的数据。

## 获取文件流
我们采用form表单自带的`submit`事件来获取文件流。文件选择后触发了change事件，在change事件中，可以对文件进行判断和处理，然后手动触发表格的`submit`事件。这里需要在外层定义一个form表单，然后里面放上一个`input[type='file']`的表单元素。然而，`input[type='file']`表单元素的样式不可配置，也就是说，我们没法改变它的按钮样子，这个肯定不合适（源生的样式也太丑了）。这里采用一个小技巧，我们都知道，`lable`元素可以和`input`元素绑定，当点击`label`的时候，相当于点击了`input`，那就好办了，我不能给你整容，我给你用个替身，然后把替身给整容不就行了。（注意：`input`不能直接设置`display: none;`，不然触发不了）
```
<template>
  <div class="el-upload">
    <form class="el-upload__form" :action="action" method="post" enctype="multipart/form-data" :target="iframeId">
      <label class="el-upload__label" :for="formId">
        <!-- TODO 这里说明下为什么不用slot插槽 -->
        <!-- 确实此处用slot更方便调用时去定制内容和样式，但是存在2个问题 -->
        <!-- 1、如果用户填入的是button等按钮时，点击button表单会自动提交 -->
        <!-- 2、由于此处模拟触发input-file的是label标签，当label标签中存在a等标签时，会被a等标签的事件覆盖掉，无法触发上传 -->
        <i :class="icon" v-if="icon"></i> {{ text }}
      </label>
      <input type="file" class="el-upload__input" :id="formId" :name="name" :multiple="multiple" @change="fileUpload" :accept="accept" v-if="!disabled">
    </form>
  </div>
</template>

<script>
export default {
  ...
}
</script>

<style lang="less">
.el-upload__input {
  /* 让file上传的input不显示，由label代替触发 */
  width: 0.1px;
  height: 0.1px;
  opacity: 0;
  overflow: hidden;
  position: absolute;
  z-index: -1;
}
</style>
```
  
## 接收服务器响应数据
源生组件使用的是`ajax`请求，所以接收响应数据并不是什么难事。但这里用了`submit`事件发送，页面会会随着submit的触发而跳转，不能做到异步化。参考的jquery的一款上传插件ajaxFileUpload，这里采用了一个黑科技：iframe页面接收。  
首先，定义了一个iframe标签，将它的top和left设置的很大（至少不会显示在页面中），给它一个`name`和`id`，同时给form一个属性target对应iframe的`id`，如此一来，完成`submit`事件后，页面会以iframe内部加载的形式接收到服务器数据。然后给iframe绑定`onload`事件监听，由于页面上的是text格式，需要解析成json。*注意：服务器返回的响应格式必须为text/html，即响应头中Content-type需要设置为text/html，否则IE下会变成下载一个json文件*。
```
<template>
  <div class="el-upload" :class="[uploadType, uploadDisabled]">
    <form class="el-upload__form" :action="action" method="post" enctype="multipart/form-data" :target="iframeId">
      <label class="el-upload__label" :for="formId">
        <i :class="icon" v-if="icon"></i> {{ text }}
      </label>
      <input type="file" class="el-upload__input" :id="formId" :name="name" :multiple="multiple" @change="fileUpload" :accept="accept" v-if="!disabled">
      <input type="hidden" v-for="item in uploadData" :key="item.key" :name="item.key" :value="item.value">
    </form>
    <iframe class="el-upload__iframe" :id="iframeId" :name="iframeId"></iframe>
  </div>
</template>
```

```
submit() {
  this.$nextTick(function() {
    if (this.disabled) return;
    let fileInput = document.getElementById(this.formId);
    let iframe = document.getElementById(this.iframeId);
    let file = fileInput.value;
    // （手动上传的情况下，文件为空的情况处理）
    if (!file) return;

    fileInput.parentNode.submit();
    // 给iframe绑定登录时间
    // 当请求结束以后，解析iframe中返回的内容，并且触发on-success事件
    iframe.onload = () => {
      let response = '';
      try {
        if (iframe.contentWindow) {
          response = JSON.parse(iframe.contentWindow.document.body.innerText);
        } else if (iframe.contentDocument) {
          response = JSON.parse(iframe.contentDocument.document.body.innerText);
        }

        // 请求成功时的钩子
        // @param {Object} response 响应结果
        // @param {String} file 上传的文件
        if (this.onSuccess) this.onSuccess(response, file);
      } catch (e) {
        if (this.onFail) this.onFail(e);
      } finally {
        // 不管是否有报错，将input的值重置
        // 因为部分浏览器下，不重置将无法重复提交相同的文件
        fileInput.parentNode.reset();
      }
    };
  });
}
```

## 组件优化
为了满足其它的业务需求，组件还添加了以下功能：
* 支持自定义风格样式
* 支持自定义上传文件的字段
* 支持附带其它上传的参数
* 支持手动上传
* 支持多个文件上传
* 支持成功、失败的回调和上传前的回调  
  
> 组件是专门适配IE9的，由于实现方法的限制，没法像Element-ui的上传组件一样提供所有的功能，比如slot插槽等。
