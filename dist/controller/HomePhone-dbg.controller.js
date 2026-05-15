sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ndc/BarcodeScanner",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Label",
    "sap/m/library",
    "sap/m/MessageToast",
    "sap/m/Text",
    "sap/m/TextArea"
],
    function (Controller, BarcodeScanner, Filter, FilterOperator, MessageBox, BusyIndicator, Dialog, Button, Label, mobileLibrary, MessageToast, Text, TextArea) {
        "use strict";

        // shortcut for sap.m.ButtonType
        var ButtonType = mobileLibrary.ButtonType;

        // shortcut for sap.m.DialogType
        var DialogType = mobileLibrary.DialogType;

        return Controller.extend("com.emami.warehousemanagement.controller.HomePhone", {
            onInit: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("RouteHomePhone").attachPatternMatched(this._onObjectMatched, this);
            },
            _onObjectMatched: function (oEvent) {
                var that = this;
                var oDataModel = this.getView().getModel();

                oDataModel.read("/Warehouse_NumberSet", {
                    success: function (oSuccess) {
                        var oJsonWareHouseNumberModel = that.getView().getModel("jsonWareHouseNumberModel");
                        oJsonWareHouseNumberModel.setData(oSuccess.results);
                    },

                    error: function (oError) {
                        MessageBox.error("Error in getting warehouse number details.");
                    }
                });

                oDataModel.read("/Shipment_TypeSet", {
                    success: function (oSuccess) {
                        var oJsonShipmentTypeModel = that.getView().getModel("jsonShipmentTypeModel");
                        oJsonShipmentTypeModel.setData(oSuccess.results);
                    },

                    error: function (oError) {
                        MessageBox.error("Error in getting shipment type details");
                    }
                });

                oDataModel.read("/Storage_TypeSet", {
                    success: function (oSuccess) {
                        var oJsonStorageTypeModel = that.getView().getModel("jsonStorageTypeModel");
                        oJsonStorageTypeModel.setData(oSuccess.results);
                    },

                    error: function (oError) {
                       
                    }
                });

            },


            onPressScan: function (oEvent) {

                var sPath = oEvent.getSource().getParent().getParent().getParent().getParent().getBindingContextPath();

                // QR Code Scanner Logic

                sap.ndc.BarcodeScanner.scan(
                    jQuery.proxy(function (oSuccess) {

                       
                        var QRTextValue = oSuccess.text;
                        var aQRText = QRTextValue.split("/");
                        var oJsonListModel = this.getView().getModel("jsonListModel");

                        var sPathItem = sPath + "/BinNumbers"
                        var currentItem = oJsonListModel.getProperty(sPath);
                        // currentItem.Lgpla = QRTextValue;
                        // currentItem.Lgpla = aQRText[1];
                        //Checking bin

                        var Items = oJsonListModel.getProperty(sPathItem);
                        if (Items.length > 0) {
                            const found = Items.find(item => item.Lgpla == aQRText[1]);
                            if (found) {
                                MessageBox.error("Bin Number Already There");
                                return;
                            }
                        }

                        //Adding Multiple Bin Feature
                        currentItem.BinNumbers.push({
                            "Lgpla": aQRText[1],
                            "Menge": "0",
                            "Tanum": "0000000000"

                        });
                        oJsonListModel.setProperty(sPath, currentItem);


                        var oJsonCentralModel = this.getView().getModel("jsonCentralModel");
                        var aItems = oJsonCentralModel.getProperty("/HomePhone/LocalItems");
                        aItems.push(currentItem);
                        oJsonCentralModel.setProperty("/HomePhone/LocalItems", aItems);
                        oJsonCentralModel.refresh();

                    }, this),
                    function (oError) {
                        
                        // sap.m.MessageBox.error(Error);
                    }
                );
            },

            onPressSearch: function () {

                var oJsonListModel = this.getView().getModel("jsonListModel");
                oJsonListModel.setData(null);

                var WareHouseNumber = this.getView().byId('idWareHouseNumber').getValue();
                var SourceStorageType = this.getView().byId('idSourceStorageType').getValue();
                var DestStorageType = this.getView().byId('idDestStorageType').getValue();
                var ShipmentType = this.getView().byId('idShipmentType').getValue();

                var CBStatusOpen = this.getView().byId('idCBStatusOpen').getSelected();
                var CBPartiallyDelivered = this.getView().byId('idCBPartiallyDelivered').getSelected();
                var CBCompleted = this.getView().byId('idCBCompleted').getSelected();

                var ExecutedFromDate = this.getView().byId('idDPExecuteFrom').getDateValue();

                // Mandatory Field Check

                if (!WareHouseNumber || !ExecutedFromDate) {
                    MessageBox.error("Please input required field.\n\n(WareHouse Number & Execute From Date)");
                    return;
                }

                // ExecutedFromDate.setDate(ExecutedFromDate.getDate() + 1);

                // Fetching Data from backend based on user filter input

                var that = this;
                var oDataModel = this.getView().getModel();

                var aFilters = [
                    new sap.ui.model.Filter("Lgnum", FilterOperator.EQ, WareHouseNumber),
                    new sap.ui.model.Filter("Lety1", FilterOperator.EQ, SourceStorageType),
                    new sap.ui.model.Filter("Lety2", FilterOperator.EQ, DestStorageType),
                    new sap.ui.model.Filter("Trart", FilterOperator.EQ, ShipmentType),
                    new sap.ui.model.Filter("Stato", FilterOperator.EQ, CBStatusOpen),
                    new sap.ui.model.Filter("Statt", FilterOperator.EQ, CBPartiallyDelivered),
                    new sap.ui.model.Filter("State", FilterOperator.EQ, CBCompleted),
                    new sap.ui.model.Filter("Pdaab", FilterOperator.EQ, ExecutedFromDate)
                ];

                BusyIndicator.show();
                var expand = "Items/BinNumbers";

                oDataModel.read("/TRItemsSet", {
                    filters: aFilters,
                    urlParameters: {
                        "$expand": expand
                    },
                    success: function (oSuccess) {
                        BusyIndicator.hide();
                        
                        var Temp = { ...oSuccess };
                        var Data = Temp.results[0];
                        Data['Items'] = [...Temp.results[0].Items.results];
                        Data['Items'].forEach(item => {
                            item['BinNumbers'] = item['BinNumbers']['results'];
                        });
                        oJsonListModel.setData(Data);

                        //Find Unique Records of Material

                       
                        let aItems = [...Data['Items']];
                        let uniqueArray = Array.from(new Set(aItems.map(item => item.Matnr)))
                            .map(Matnr => aItems.find(obj => obj.Matnr === Matnr));

                        var oJsonMaterialModel = that.getView().getModel("jsonMaterialModel");
                        oJsonMaterialModel.setData(uniqueArray);

                        that.fnStyle(Data.Items);

                        // oSuccess.results = [
                        //     {
                        //         "Tbnum": "001",
                        //         "Tanum": "0000000000",
                        //         "ToConf": "X",
                        //         "Lgpla": "",
                        //         "Menge": "5",
                        //         "BinNumbers": [
                        //             {
                        //                 "Lgpla": "123",
                        //                 "Menge": "1"
                        //             }
                        //         ]
                        //     },
                        //     {
                        //         "Tbnum": "002",
                        //         "Tanum": "0000000000",
                        //         "Lgpla": "",
                        //         "Menge": "2",
                        //         "BinNumbers": []
                        //     }
                        // ]

                        // oJsonListModel.setData(oSuccess.results);
                        // that.fnStyle(oSuccess.results);
                    },

                    error: function (oError) {
                        
                        BusyIndicator.hide();
                        MessageBox.error("Internal Server Error");
                    }
                });

            },

            onPressClear: function () {

                this.getView().byId('idWareHouseNumber').setValue('');
                this.getView().byId('idSourceStorageType').setValue('');
                this.getView().byId('idDestStorageType').setValue('');
                this.getView().byId('idShipmentType').setValue('');

                this.getView().byId('idCBStatusOpen').setSelected(false);
                this.getView().byId('idCBPartiallyDelivered').setSelected(false);
                this.getView().byId('idCBCompleted').setSelected(false);

                this.getView().byId('idDPExecuteFrom').setDateValue();

                var oJsonListModel = this.getView().getModel("jsonListModel");
                oJsonListModel.setData(null);

                var oJsonMaterialModel = this.getView().getModel("jsonMaterialModel");
                oJsonMaterialModel.setData(null);

                this.onPressRemoveMaterialFilter();

            },

            onPressSave: function () {
               

                var { oData } = this.getView().getModel("jsonListModel");
                var Items = [];
                var payload = {
                    "Action": "D"
                };

                oData['Items'].forEach(item => {
                    if (item.BinNumbers.length > 0) {

                        let Temp = [];
                        item['BinNumbers'].forEach(bin => {
                            if (Number(bin.Menge) > 0) {
                                Temp.push(bin);
                            }
                        });

                        item['BinNumbers'] = [...Temp];
                        Items.push(item);
                    }
                });

                payload['Items'] = [...Items];

                var that = this;
                var oDataModel = this.getView().getModel();

                BusyIndicator.show();

                oDataModel.create("/TRItemsSet", payload,
                    {
                        success: function (oSucess) {
                            BusyIndicator.hide();

                            var oJsonMessageModel = that.getView().getModel("jsonMessageModel");

                            if (oSucess.Items.results) {
                                oSucess.Items.results = oSucess.Items.results.filter(item => item.Msgty !== '');
                            }
                            oJsonMessageModel.setData(oSucess.Items.results);
                          
                            if (oSucess.Items.results.length > 0) {
                                if (!that.MessageDialog) {
                                    that.MessageDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.Message", that);
                                    that.getView().addDependent(that.MessageDialog);
                                }
                                that.MessageDialog.open();
                            } else {
                                MessageBox.success("Saved");
                            }
                        },
                        error: function (oError) {
                            BusyIndicator.hide();
                            MessageBox.error("Internal Server Error");
                        }
                    });

                // return;

                // var { oData } = this.getView().getModel("jsonListModel");
                // var aTempItems = oData;
                // var aFinalItems = [];

                // for (var i = 0; i < aTempItems.length; i++) {
                //     if (aTempItems[i].Lgpla) {
                //         aFinalItems.push(aTempItems[i]);
                //     }
                // }

                // var payload = {
                //     "Action": "D",
                //     "Transfer_Item": aFinalItems
                // };

                // var that = this;
                // var oDataModel = this.getView().getModel();

                // BusyIndicator.show();



                // oDataModel.create("/Transfer_Requirement_PostSet", payload,
                //     {
                //         success: function (oSucess) {
                //             BusyIndicator.hide();
                //             MessageBox.success("Saved");
                //         },
                //         error: function (oError) {
                //             BusyIndicator.hide();
                //             MessageBox.error("Internal Server Error");
                //         }
                //     });

            },



            
            onPressCreateTransferOrder: function () {

                if (!this.oApproveDialog) {
                    this.oApproveDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        content: new Text({ text: "Do you want to submit this order?" }),
                        beginButton: new Button({
                            type: ButtonType.Emphasized,
                            text: "Submit",
                            press: function () {
                                this.fnCreateTransferOrder();
                                this.oApproveDialog.close();
                            }.bind(this)
                        }),
                        endButton: new Button({
                            text: "Cancel",
                            press: function () {
                                this.oApproveDialog.close();
                            }.bind(this)
                        })
                    });
                }

                this.oApproveDialog.open();

            },

            fnCreateTransferOrder: function () {

            

                var { oData } = this.getView().getModel("jsonListModel");
                var Items = [];
                var payload = {
                    "Action": "T"
                };

                // oData['Items'].forEach(item => {
                //     if(item.BinNumbers.length > 0 && item.ToConf == ''){
                //         Items.push(item);
                //     }
                // });

                oData['Items'].forEach(item => {
                    if (item.BinNumbers.length > 0 && item.ToConf == '') {

                        let Temp = [];
                        item['BinNumbers'].forEach(bin => {
                            if (Number(bin.Menge) > 0) {
                                Temp.push(bin);
                            }
                        });

                        item['BinNumbers'] = [...Temp];
                        Items.push(item);
                    }
                });

                payload['Items'] = [...Items];


                var that = this;
                var oDataModel = this.getView().getModel();

                var that = this;
                BusyIndicator.show();
                var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                oDataModel.create("/TRItemsSet", payload,
                    {
                        success: function (oSucess) {

                            BusyIndicator.hide();

                            var oJsonMessageModel = that.getView().getModel("jsonMessageModel");

                            if (oSucess.Items.results) {
                                oSucess.Items.results = oSucess.Items.results.filter(item => item.Msgty !== '');
                            }
                            oJsonMessageModel.setData(oSucess.Items.results);

                            if (!that.MessageDialog) {
                                that.MessageDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.Message", that);
                                that.getView().addDependent(that.MessageDialog);
                            }
                            that.MessageDialog.open();
                        },
                        error: function (oError) {
                            BusyIndicator.hide();
                            MessageBox.error("Internal Server Error");
                        }
                    });

                // var { oData } = this.getView().getModel("jsonListModel");
                // var aTempItems = oData;
                // var aFinalItems = [];

                // for (var i = 0; i < aTempItems.length; i++) {
                //     if (aTempItems[i].Lgpla && aTempItems[i].ToConf == '') {
                //         aFinalItems.push(aTempItems[i]);
                //     }
                // }

                // var payload = {
                //     "Action": "T",
                //     "Transfer_Item": aFinalItems
                // };

                // var that = this;
                // var oDataModel = this.getView().getModel();

                // var that = this;
                // BusyIndicator.show();
                // var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
                // oDataModel.create("/Transfer_Requirement_PostSet", payload,
                //     {
                //         success: function (oSucess) {

                //             BusyIndicator.hide();

                //             var oJsonMessageModel = that.getView().getModel("jsonMessageModel");

                //             if (oSucess.Transfer_Item.results) {
                //                 oSucess.Transfer_Item.results = oSucess.Transfer_Item.results.filter(item => item.Msgty !== '');
                //             }
                //             oJsonMessageModel.setData(oSucess.Transfer_Item.results);

                //             if (!that.MessageDialog) {
                //                 that.MessageDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.Message", that);
                //                 that.getView().addDependent(that.MessageDialog);
                //             }
                //             that.MessageDialog.open();
                //         },
                //         error: function (oError) {
                //             BusyIndicator.hide();
                //             MessageBox.error("Internal Server Error");
                //         }
                //     });
            },

            onValueHelpMaterial: function () {
                var that = this;

                if (!that.MaterialDialog) {
                    that.MaterialDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.MaterialDialog", that);
                    that.getView().addDependent(that.MaterialDialog);
                }
                that.MaterialDialog.open();
            },
            onSearchMaterialDialog: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new Filter("Matnr", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Maktx", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },
            onPressMaterialDialog: function (oEvent) {
                var Matnr = oEvent.getParameter("selectedItem").getCells()[0].getText();
                this.getView().byId('idMaterial').setValue(Matnr);

                var aFilters = [];
                if (Matnr) {
                    aFilters.push(new Filter("Matnr", FilterOperator.Contains, Matnr));
                }
                var oList = this.getView().byId("idGridList");
                var oBinding = oList.getBinding("items");
                oBinding.filter(aFilters);

                this.fnStyleFilter(oList);
            },
            onPressRemoveMaterialFilter : function(){
                this.getView().byId('idMaterial').setValue('');
                var aFilters = [];
                var oList = this.getView().byId("idGridList");
                var oBinding = oList.getBinding("items");
                oBinding.filter(aFilters);

                this.fnStyleFilter(oList);
            },
            onValueHelpWareHouseNumber: function () {
                var that = this;

                if (!that.WareHouseNumberDialog) {
                    that.WareHouseNumberDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.WareHouseNumber", that);
                    that.getView().addDependent(that.WareHouseNumberDialog);
                }
                that.WareHouseNumberDialog.open();

            },
            onValueHelpSourceStorageType: function () {

                var that = this;

                if (!that.SourceStorageTypeDialog) {
                    that.SourceStorageTypeDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.SourceStorageType", that);
                    that.getView().addDependent(that.SourceStorageTypeDialog);
                }
                that.SourceStorageTypeDialog.open();

            },
            onValueHelpDestStorageType: function () {

                var that = this;

                if (!that.DestStorageTypeDialog) {
                    that.DestStorageTypeDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.DestStorageType", that);
                    that.getView().addDependent(that.DestStorageTypeDialog);
                }
                that.DestStorageTypeDialog.open();

            },
            onValueHelpShipmentType: function () {

                var that = this;

                if (!that.ShipmentTypeDialog) {
                    that.ShipmentTypeDialog = sap.ui.xmlfragment("com.emami.warehousemanagement.view.fragments.ShipmentType", that);
                    that.getView().addDependent(that.ShipmentTypeDialog);
                }
                that.ShipmentTypeDialog.open();

            },

            onSearchWareHouseNumberDialog: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new Filter("Lgnum", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Lnumt", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            onPressWareHouseNumberDialog: function (oEvent) {
                var WareHouseNumber = oEvent.getParameter("selectedItem").getCells()[0].getText();
                this.getView().byId('idWareHouseNumber').setValue(WareHouseNumber);
            },

            onSearchSourceStorageTypeDialog: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new Filter("Lgnum", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Lgtyp", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Ltypt", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            onPressSourceStorageTypeDialog: function (oEvent) {
                var SourceStorageType = oEvent.getParameter("selectedItem").getCells()[1].getText();
                this.getView().byId('idSourceStorageType').setValue(SourceStorageType);
            },

            onSearchDestStorageTypeDialog: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new Filter("Lgnum", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Lgtyp", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Ltypt", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            onPressDestStorageTypeDialog: function (oEvent) {
                var DestStorageType = oEvent.getParameter("selectedItem").getCells()[1].getText();
                this.getView().byId('idDestStorageType').setValue(DestStorageType);
            },

            onSearchShipmentTypeDialog: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new Filter("Lgnum", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Trart", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Tratx", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            onPressShipmentTypeDialog: function (oEvent) {
                var ShipmentType = oEvent.getParameter("selectedItem").getCells()[1].getText();
                this.getView().byId('idShipmentType').setValue(ShipmentType);
            },

            onSearchMessageDialog: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new sap.ui.model.Filter({
                    filters: [
                        new Filter("Msgty", sap.ui.model.FilterOperator.Contains, sValue),
                        new Filter("Message", sap.ui.model.FilterOperator.Contains, sValue)
                    ],
                    and: false
                });
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },
            onCancelMessage: function () {
                this.onPressSearch();
            },
            fnStyle: function (Items) {

                var oIdGridList = this.getView().byId("idGridList");

                for (var i = 0; i < Items.length; i++) {
                    if (Items[i].ToConf == 'X') {
                        oIdGridList.mAggregations.items[i].addStyleClass("greenBgItem");
                    }
                }
            },
            fnStyleFilter : function(oList){
                let items = oList.mAggregations.items;
                if(items){
                    items.forEach((item, index) => {
                        let value = this.getView().getModel("jsonListModel").getProperty(item.oBindingContexts.jsonListModel.sPath)
                        if(value.ToConf){
                            item.addStyleClass("greenBgItem");
                        }else{
                            item.removeStyleClass("greenBgItem");
                        }
                    });
                }         
            },
            onPressDeleteItem: function (oEvent) {

                var sPath = oEvent.getSource().oParent.oBindingContexts.jsonListModel.sPath;
                // var ItemPath = '/' + sPath.split('/')[1] + '/' + sPath.split('/')[2];
                var ItemPath = '/' + sPath.split('/')[1] + '/' + sPath.split('/')[2] + '/' + sPath.split('/')[3];

                var oJsonListModel = this.getView().getModel("jsonListModel");

                var Items = oJsonListModel.getProperty(ItemPath);
                var oClicked = oJsonListModel.getProperty(sPath);

                if (Items) {
                    Items = Items.filter(item => item.Lgpla !== oClicked.Lgpla);
                }

                oJsonListModel.setProperty(ItemPath, Items);
                oJsonListModel.refresh();
            },

            onLiveChangeQuantityValid: function (oEvent) {
                var sPath = oEvent.getSource().oParent.oBindingContexts.jsonListModel.sPath;
                var ItemPath = '/' + sPath.split('/')[1] + '/' + sPath.split('/')[2] + '/' + sPath.split('/')[3];
                var ParentPath = '/' + sPath.split('/')[1] + '/' + sPath.split('/')[2];

                var oJsonListModel = this.getView().getModel("jsonListModel");

                var Items = oJsonListModel.getProperty(ItemPath);
                var ParentData = oJsonListModel.getProperty(ParentPath);
                var oClicked = oJsonListModel.getProperty(sPath);

                var Temp = [];
                if (Items) {
                    Temp = Items.filter(item => item.Lgpla !== oClicked.Lgpla);
                }

                const sum = Temp.reduce((accumulator, currentValue) => {
                    return accumulator + Number(currentValue.Menge);
                }, 0);

                const liveQuantity = oEvent.getParameter('value');

                const total = Number(liveQuantity) + sum;

                if (total > Number(ParentData.Menge)) {
                    // oEvent.getSource().setValueState('Error');
                    // oEvent.getSource().setValueStateText('Sum of all quantity should not be greater than TR Quantity');
                    MessageBox.error("Sum of all quantity should not be greater than TR Quantity");

                    // ParentData.check = 'X';
                    // oJsonListModel.setProperty(ParentPath, ParentData);
                    // oJsonListModel.refresh();

                    return;
                }
                // oEvent.getSource().setValueState('None');
                // oEvent.getSource().setValueStateText('');

                // ParentData.check = '';
                // oJsonListModel.setProperty(ParentPath, ParentData);
                // oJsonListModel.refresh();
            }
        });
    });
