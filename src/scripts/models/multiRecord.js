/******************************************************************************
 * Multi record model.
 *****************************************************************************/
define([
  'backbone',
  'helpers/currentDate'
], function (Backbone, currentDate) {
  'use strict';

  var RecordModel = Backbone.Model.extend({

  });

  var RecordCollection = Backbone.Collection.extend({
    model: RecordModel
  });

  var Model = Backbone.Model.extend({
    initialize: function () {
      _log('models.MultiRecord: init.', log.DEBUG);

      this.clear();

      this.initRecordsCollection();

      this.set(morel.record.inputs.KEYS.DATE, currentDate);
      this.set(morel.record.inputs.KEYS.SREF_ACCURACY, '-1');
      this.set(morel.record.inputs.KEYS.SREF_SYSTEM, '4326');
      this.set(morel.record.inputs.KEYS.FULL_LIST, morel.record.inputs.KEYS.FULL_LIST.FALSE);
      this.removeAllRecords();
    },

    initRecordsCollection: function () {
      this.set('records', new RecordCollection());
    },

    isRecord: function (id) {
      return this.getRecord(id);
    },

    getRecord: function (id) {
      return this.get('records').get(id);
    },

    setRecord: function (record) {
      this.get('records').add(record);
      //todo: should do it automatically
      this.get('records').trigger('change');
    },

    setRecordSpeciesID: function (id) {
      var specie = app.collections.species.find({id: id + ''}); //needs to be a string
      var record = {};
      record[morel.record.inputs.KEYS.TAXON] = specie.attributes.warehouse_id;

      this.setRecord(record);
    },

    removeRecord: function (id) {
      this.get('records').remove(id);
    },

    getAllRecords: function () {
      return this.get('records').reset();
    },

    removeAllRecords: function () {
      this.get('records')
    },

    /**
     * Sends the record.
     */
    send: function (callback, onError) {

    },

    /**
     * Saves the record.
     */
    save: function (callback, onError) {

    },

    /**
     * Validates the record inputs.
     */
    validate: function (attrs, options) {
      var invalids = [];

      if (!this.has(morel.record.inputs.KEYS.DATE)) {
        invalids.push('Date');
      } else {
        //check if valid date
        var input = this.get(morel.record.inputs.KEYS.DATE);
        var inputDate = new Date(input);
        var currentDate =  new Date();
        if (inputDate > currentDate) {
          invalids.push('Non future Date');
        }
      }

      if (!this.has(morel.record.inputs.KEYS.SREF)) {
        invalids.push('Location');
      }
      if (!this.has(morel.record.inputs.KEYS.TAXON)) {
        invalids.push('Taxon');
      }
      return invalids.length > 0 ? invalids : null;
    }
  });

  return Model;
});