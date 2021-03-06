import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormOption, FormGroupOption, FormArrayItem, FormGroupItem, SelectOption } from '../interface';
import { FormBuilder, FormArray, FormGroup } from '@angular/forms';

import { FormGroupsService } from '../service/form-groups.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-form-dynamic',
  templateUrl: './form-dynamic.component.html',
  styleUrls: ['./form-dynamic.component.less'],
  providers: [
    FormGroupsService
  ]
})
export class FormDynamicComponent implements OnInit, OnDestroy {

  @Input() set options(value: FormOption[]) {
    this.groupService.options = value;
  }

  get options(): FormOption[] {
    return this.groupService.options;
  }

  @Input() set layout(value: 'horizontal' | 'vertical' | 'inline') {
    this.groupService._layout = value || 'horizontal';
  }

  get layout(): 'horizontal' | 'vertical' | 'inline' {
    return this.groupService._layout;
  }

  @Output() formSubmit: EventEmitter<any> = new EventEmitter();

  private listenKeys: string[] = [];
  private defaultValue: {
    [key: string]: any;
  } = {};

  constructor(
    private fb: FormBuilder,
    public groupService: FormGroupsService
  ) {
  }

  ngOnInit() {
    this.initFormGroup();
    this.initListen();
    // 初始化触发
    this.groupService.FormGroup.reset(this.defaultValue);
  }

  initFormGroup() {
    this.options.forEach((item: FormOption, index) => {
      this.groupService.FormGroupOption[item.key] = this.initItemConfig(item);
    });
    this.groupService.FormGroup = this.fb.group(this.groupService.FormGroupOption);
  }

  initListen(): void {
    this.listenKeys.forEach((item: string) => {
      this.groupService.listenComponetDestroyeds$[item] = new Subject<any>();
      this.groupService.FormGroup.get(item).valueChanges.pipe(
        takeUntil(this.groupService.listenComponetDestroyeds$[item])
      ).subscribe((value: any) => {
        this.clearGroupForm(this.groupService.groupOptions[item].formGroup);
        if (value !== null && value !== undefined) {
          const groupOption: FormGroupOption = this.groupService.groupOptions[item].formGroup[value];
          if (groupOption) {
            this.groupService.FormGroup.addControl(groupOption.key, this.creatFormGroup(groupOption.groups));
          }
        }
      });
    });
  }

  clearGroupForm(item: FormGroupItem) {
    for (const key in item) {
      if (key) {
        this.groupService.FormGroup.removeControl(item[key].key);
      }
    }
  }

  creatFormGroup(options: FormOption[]): FormGroup {
    const formoptions = {};

    options.forEach((item: FormOption) => {
      formoptions[item.key] =  this.initItemConfig(item);
    });

    return this.fb.group(formoptions);
  }

  initItemConfig(item: FormOption, parent?: FormOption): any {
    const result: any = this.creatValueConfig(item);
    const key: string = parent ? parent.key + '-' + item.key : item.key;
    this.groupService.groupOptions[key] = item;

    if (item.formGroup) {
      this.listenKeys.push(key);
    }
    return result;
  }

  creatValueConfig(item: FormOption): any {
    let valueOption: any = null;
    if (item.value instanceof Array && typeof item.value[0] === 'object') {
      let value: any = null;
      if (item.type === 'checkbox') {
        value = this.initcheckBox(item);
      } else {
        value = item.value[0].value;
      }
      valueOption = [
        {
          value: value,
          disabled: item.value[0].disabled || false
        },
        item.value[1]
      ];
      item.required = item.value[0].required || false;
      this.defaultValue[item.key] = value;
    } else {
      let value: any = null;
      if (item.type === 'checkbox') {
        value = this.initcheckBox(item, 'out');
      } else {
        value = item.value;
      }

      valueOption = value;
      item.required = false;
      this.defaultValue[item.key] = value;
    }
    return valueOption;
  }

  initcheckBox(item: FormOption, type?: 'out'): SelectOption[] {
    let result: SelectOption[] = [];
    const body = type === 'out' ? item : item.value[0];
    if (item.selectOptions instanceof Array) {
      if (body.value && body.value.length) {
        item.selectOptions.forEach(one => {
          if ( body.value.indexOf(one.value) !== -1 ) {
            one.checked = true;
          } else {
            one.checked = false;
          }
        });
      }
      result = item.selectOptions;
    } else {
    }

    return result;
  }

  submitForm() {
    this.formSubmit.emit(this.groupService.FormGroup.getRawValue());
  }

  ngOnDestroy() {
    this.groupService.ngOnDestroy();
  }
}
