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
   
