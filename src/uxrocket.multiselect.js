/**
 * Turkcell UXITD
 * jQuery based multiselect plugin.
 *
 * @author Rameş Aliyev
 * @version 0.2.0
 *
 * @dependencies
 * - UXRocketFactory
 * - UXRocketUtils
 * - jQuery
 * - Lodash
 */
(function(window, $){
    "use strict";

    // Default template.
    var templates = {
        default: {
            wrap                :   "<span class='uxrocket-multiselect-wrap uxrocket-plugin-wrap uxitd-plugin-wrap'></span>",

            component           :   "<span class='uxrocket-multiselect-component'>" +
                                        "<span class='uxrocket-multiselect-component-list'>" +
                                        "</span>"+
                                        "<i class='uxrocket-icon-arrow-down'></i>"+
                                    "</span>",

            componentList       :   "{{#unless this}}Seçiniz{{/unless}}"+
                                    "{{#each this}}"+
                                        "{{this}}, "+
                                    "{{/each}}",

            dropdown            :   "<div class='uxrocket-multiselect-dropdown'>" +
                                        "<input class='uxrocket-multiselect-search-input' type='text' />"+

                                        "<span class='uxrocket-multiselect-title'>Seçilenler</span>"+
                                        "<div class='uxrocket-multiselect-selecteds'></div>"+

                                        "<div class='uxrocket-multiselect-not-selecteds'></div>"+
                                    "</div>",

            list                :   "<ul class='uxrocket-multiselect-list'>"+
                                        "{{#each list}}"+
                                            "<li data-value='{{this}}' class='uxrocket-multiselect-list-item'>" +
                                                "<label><input type='checkbox' {{#if ../checked}}checked{{/if}} />{{this}}</label>" +
                                            "</li>"+
                                        "{{/each}}"+
                                    "</ul>"
        }
    };

    // Constructor
    function MultiSelect(){
        // Data holder.
        this.data = {
            selecteds       : [],
            notSelecteds    : []
        };

        // Classes
        this.classes = {
            wrap: {
                legacy: "uxitd-plugin-wrap",
                actual: "uxrocket-plugin-wrap",
                custom: "uxrocket-multiselect-wrap"
            },
            list: {
                allSelected: "uxrocket-multiselect-all-selected"
            }
        };

        // Selectors
        this.selectors = {
            pluginWrapper   : ".uxrocket-multiselect-wrap",
            selectedsTitle  : ".uxrocket-multiselect-title",
            componentList   : ".uxrocket-multiselect-component-list",
            selectedsList   : ".uxrocket-multiselect-selecteds",
            notSelectedsList: ".uxrocket-multiselect-not-selecteds",
            listItem        : ".uxrocket-multiselect-list-item",
            searchInput     : ".uxrocket-multiselect-search-input"
        };

        // Elements
        this.elements = {
            wrap            : null,
            component       : null,
            componentList   : null,
            dropdown        : null,
            searchInput     : null,
            selectedsTitle  : null,
            selectedsList   : null,
            notSelectedsList: null
        };

        // Set layout.
        this.setLayout();

        // Bind UI actions.
        this.bindUIActions();

        // Detect and fetch source.
        this.fetchSource();

        // Attach data to original element.
        this.options.$el.data("multiselect-data", []);
    }

    // Default options.
    MultiSelect.prototype.options = {
        template        : templates.default,
        customClasses   : {
            wrap        : "",
            component   : "",
            dropdown    : ""
        }
    };

    // Set layout.
    MultiSelect.prototype.setLayout = function(){
        // Alias.
        var classes     = this.classes,
            template    = this.options.template,
            $el         = this.options.$el,
            $parent     = $el.parent();

        // Elements.
        var wrap, component, dropdown;

        // Check parent.
        if($parent.is(classes.wrap.legacy +", "+this.classes.wrap.actual)){
            // Add custom class to parent.
            $parent
                .addClass(classes.wrap.custom)
                .addClass(this.options.customClasses.wrap);

            // Assign wrap to parent.
            this.elements.wrap = $parent;
        }else{
            // Create wrap.
            wrap = this.render(template.wrap);

            // Modify wrap.
            this.elements.wrap =
                $(wrap)
                    .insertAfter($el);
        }

        // Create component and append to wrapper.
        component = this.render(template.component);
        this.elements.component =
            $(component)
                .addClass(this.options.customClasses.component)
                .appendTo(this.elements.wrap);

        // Create dropdown and append to body.
        dropdown = this.render(template.dropdown);
        this.elements.dropdown =
            $(dropdown)
                .addClass(this.options.customClasses.dropdown)
                .appendTo("body");

        // Get other elements.
        this.elements.selectedsTitle    = this.elements.dropdown.find(this.selectors.selectedsTitle);
        this.elements.selectedsList     = this.elements.dropdown.find(this.selectors.selectedsList);
        this.elements.notSelectedsList  = this.elements.dropdown.find(this.selectors.notSelectedsList);
        this.elements.searchInput       = this.elements.dropdown.find(this.selectors.searchInput);
        this.elements.componentList     = this.elements.component.find(this.selectors.componentList);

        // Hide element and selected list.
        $el.hide();
        this.elements.selectedsTitle.hide();
        this.elements.selectedsList.hide();

        // Render component list.
        this.renderComponentList();
    };

    // Set bindings
    MultiSelect.prototype.bindUIActions = function(){
        // Store context.
        var _this = this;

        // Click on component.
        this.elements.component.on("click", function(){
            _this.toggleDropdown();
        });

        // Click on not selecteds list item.
        this.elements.notSelectedsList.on("click", this.selectors.listItem, function(event){
            event.preventDefault();

            // Get li.
            var li = $(event.currentTarget);

            // Select item.
            _this.selectItem(li.data("value"));

            // Hide li.
            li.hide();
        });

        // Click on selecteds list item.
        this.elements.selectedsList.on("click", this.selectors.listItem, function(event){
            event.preventDefault();

            // Get li.
            var li = $(event.currentTarget);

            // Unselect item.
            _this.unSelectItem(li.data("value"));

            // Hide li.
            li.hide();
        });

        // Bind search to searchInput keydown.
        this.elements.searchInput.on("keyup", function(){
            _this.searchInNotSelecteds($(this).val());
        });

        // Adjust position on window resize.
        window.onresize = function(){
            _this.adjustPosition();
        };

        // Close when document clicked.
        $(document).on("click", function(event){
            if(!$(event.target).parents(_this.selectors.pluginWrapper).length) _this.elements.dropdown.hide();
        });
    };

    // Toggle dropdown.
    MultiSelect.prototype.toggleDropdown = function(){
        this.adjustPosition();
        this.elements.dropdown.toggle().siblings('.' + this.elements.dropdown[0].className).hide();
    };

    // Search in not-selecteds.
    MultiSelect.prototype.searchInNotSelecteds = function(key){
        // Render data
        var renderData = null;

        if(key.length){
            // Search in not selecteds.
            renderData = __.find(this.data.notSelecteds, key, {searchType: "startsWith", standardise: true});
        }else{
            renderData = this.data.notSelecteds;
        }

        // Render
        this.renderNotSelecteds(renderData);
    };

    // Select item.
    MultiSelect.prototype.selectItem = function(value){
        // Transfer value from not-selecteds to selecteds.
        this.transferValue(value, this.data.notSelecteds, this.data.selecteds);

        // Render selecteds.
        this.renderSelecteds(this.data.selecteds);
        this.renderComponentList();

        // Show selecteds part.
        this.elements.selectedsTitle.show();
        this.elements.selectedsList.show();

        // If all seleced, add class.
        if(!this.data.notSelecteds.length){
            this.elements.selectedsList.addClass(this.classes.list.allSelected);
            this.elements.notSelectedsList.hide();
        }
    };

    // Unselect item.
    MultiSelect.prototype.unSelectItem = function(value){
        // Transfer value from selecteds to not-selecteds.
        this.transferValue(value, this.data.selecteds, this.data.notSelecteds);

        // Render not-selecteds.
        this.renderNotSelecteds(this.data.notSelecteds);
        this.renderComponentList();

        // Show not-selecteds part.
        this.elements.notSelectedsList.show();

        // Remove all-selected class.
        this.elements.selectedsList.removeClass(this.classes.list.allSelected);

        // If there is no value in selecteds, hide selecteds part.
        if(!this.data.selecteds.length) {
            this.elements.selectedsTitle.hide();
            this.elements.selectedsList.hide();
        }
    };

    // Transfer value from an array to another.
    MultiSelect.prototype.transferValue = function(value, transferFrom, transferTo){
        // Push to new home.
        transferTo.push(value);

        // Remove from old one.
        _.remove(transferFrom, function(item){
            return item === value;
        });

        // Sort arrays.
        transferTo.sort();

        // Attach data to original element.
        this.options.$el.data("multiselect-data", this.data.selecteds);
    };

    // Render selecteds.
    MultiSelect.prototype.renderSelecteds = function(data){
        this.elements.selectedsList.html(this.render(this.options.template.list, {list: data, checked: true}));
    };

    // Render not-selecteds.
    MultiSelect.prototype.renderNotSelecteds = function(data){
        this.elements.notSelectedsList.html(this.render(this.options.template.list, {list: data, checked: false}));
    };

    MultiSelect.prototype.renderComponentList = function(){
        this.elements.componentList.html(this.render(this.options.template.componentList, this.data.selecteds));
    };

    // Render html
    MultiSelect.prototype.render = function(templateString, templateData){
        return this.handlebarsRender(templateString, templateData);
    };

    // Adjust element position.
    MultiSelect.prototype.adjustPosition = function(){
        // Get offset of component.
        var offset = this.elements.component.offset();
        var width = this.elements.wrap.width();
        var height = this.elements.wrap.height();

        // Attach to dropdown.
        this.elements.dropdown.css({
            top : offset.top,
            left: offset.left,
            width: width,
            "margin-top": height
        });
    };

    // Will be triggered when data fetched from source.
    MultiSelect.prototype.onSourceFetched = function(){
        this.data.notSelecteds = this.fetchedData.sort();
        this.renderNotSelecteds(this.data.notSelecteds);
    };

    // Create plugin.
    window.MultiSelect = window.UXRocketFactory.create(MultiSelect, {
        name   : "UXRocket Multi Select",
        slug   : "multiselect",
        version: "0.2.0"
    });
}(window, jQuery));