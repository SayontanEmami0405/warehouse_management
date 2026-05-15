sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/Device"
],
function (Controller,Device) {
    "use strict";

    return Controller.extend("com.emami.warehousemanagement.controller.Home", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteHome").attachPatternMatched(this._onObjectMatched, this);
        },
        _onObjectMatched: function (oEvent) {

            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            
            if (Device.system.phone || Device.system.tablet ) {
                // oRouter.navTo("RouteHomePhone");
            } else {
                // oRouter.navTo("RouteHomeDesktop");
            }
            oRouter.navTo("RouteHomePhone");
        }
    });
});
