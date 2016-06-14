##Angular Two way slider with no external dependencies aside angular 1x

## Project integration

### Imports 
```html
<link rel="stylesheet" type="text/css" href="/path/to/slider/slider.css"/>
<script src="/path/to/angularjs/angular.min.js"></script>
<script src="/path/to/slider/slider.min.js"></script>
```

### Module
```javascript
angular.module('yourApp', ['rzModule']);
```

### Initialize slider
Follow these steps to initialze the slider

Create an object array with the following properies

### 
```javascript
   var objectArray=[
       {
           nodeTop:'DBX',
           nodeBottom:'Dubai',
           midTop:'EK456',
           midBottom:'6h 30m'
       },
       {
           nodeTop:'LND',
           nodeBottom:'London',
           midTop:'EK567',
           midBottom:'4h 30m'
       },
       {
           nodeTop:'CHC',
           nodeBottom:'Christchurch'
       }
   ];
```
### 
Initialize slider model and set slider options
```javascript
    $scope.slider={
            model:objectArray,
            minValue: 1,
            maxValue: objectArray.length,
            options: {
                      step: 0,
                      ceil: objectArray.length,
                      floor: 1,
                      showTicksValues: true,
                      onChange:onSliderChangeHandler,
            }
     };
```
### 
```html
    <rzslider class='slider' onChange="onSliderChangeHandler()"
    rz-slider-model="slider.minValue"
    rz-slider-high="slider.maxValue"
    rz-slider-options="slider.options"
    rz-trip="slider.model"  ></rzslider>
```
## Common issues
### My slider is not rendered correctly on load
If the slider's parent element is not visible during slider initialization, the slider can't know when its parent becomes visible.
For instance, when displaying a slider inside an element which visibility is toggled using ng-show, you need to send an event to force it to redraw when you set your ng-show to true.

Here's an example of `refreshSlider` method that you should call whenever the slider becomes visible.
```js
vm.refreshSlider = function () {
    $timeout(function () {
        $scope.$broadcast('rzSliderForceRender');
    });
};
```

### Directive attributes
**rz-slider-model**

>Model for low value of the slider

**rz-slider-high**

>Model for high value slider. Providing both rz-slider-model and rz-slider-high will render range slider.

**rz-trip**
  
>The object array which will be displayed on the slider, each object in the array as a node on the slider.

**rz-slider-tpl-url**

>If for some reason you need to use a custom template, you can do so by providing a template URL to the rz-slider-tpl-url attribute. The default template is this one.
 
 **rz-slider-options**

>An object with all the other options of the slider. Each option can be updated at runtime and the slider will automatically be re-rendered.
 The default options are
 
 ```js
 {
    floor: 0,
    ceil: null, //defaults to rz-slider-model
    step: 1,
    precision: 0,
    minLimit: null,
    maxLimit: null,
    minRange: null,
    maxRange: null,
    id: null,
    translate: null,
    getLegend: null,
    stepsArray: null,
    draggableRange: false,
    draggableRangeOnly: false,
    showSelectionBar: false,
    showSelectionBarEnd: false,
    showSelectionBarFromValue: null,
    hidePointerLabels: false,
    hideLimitLabels: false,
    readOnly: false,
    disabled: false,
    interval: 350,
    showTicks: false,
    showTicksValues: false,
    ticksTooltip: null,
    ticksValuesTooltip: null,
    vertical: false,
    getSelectionBarColor: null,
    getPointerColor: null,
    keyboardSupport: true,
    scale: 1,
    enforceStep: true,
    enforceRange: false,
    noSwitching: false,
    onlyBindHandles: false,
    onStart: null,
    onChange: null,
    onEnd: null,
    rightToLeft: false,
    boundPointerLabels: true,
    mergeRangeLabelsIfSame: false
}
 ```

