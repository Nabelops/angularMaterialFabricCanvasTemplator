import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { fabric } from 'fabric'
import { map } from 'rxjs';
import { divide } from 'lodash';
import { WebfontFamily, WebfontList } from './fonts.model';
import { googleFontKey } from './secrets';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('myCanvas') myCanvas!: ElementRef;
  canvas!: fabric.Canvas | undefined;
  cardForm = this.initForm();
  fonts$ = this.getFonts();
  isBadImport = false;
  isParsing = false;
  isSubmitting = false;
  file: File | undefined;

  fillerText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit,' +
    'sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.' +
    ' Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris' +
    ' nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in ' +
    'reprehenderit in voluptate velit esse cill';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.canvas = new fabric.Canvas(this.myCanvas.nativeElement);
    const fillerFab = new fabric.Textbox(this.fillerText, {
      width: 400,
      fontSize: this.fontSize.value,
      top: 200,
      left: 100,
      lockScalingY: true,
      textAlign: 'center'
    })
  }
  
  align(cmd: string) {}

  process_align(cmd: string) {}

  centerHorizontalPage() {}

  centerVerticalPage() {}

  onSaveTemplate() {}

  onFileSelect(event: Event) {
    const element = event.target as HTMLInputElement;
    const files = element.files;
    if (files) {
      const file = files[0];
      const render = new FileReader();
      this.file = file
      render.readAsDataURL(file)
      render.onloadend = (e) => {
        if (render.result) {
          this.setImage(render.result as string)
        }
      }
    }
  }

  onDownload() {}

  fontCompare(o1: WebfontFamily, o2: WebfontFamily): boolean {
    return o1.family === o2.family;
  }
  
  onClearFile() {
    this.file = undefined;
    this.isParsing = false;
    const image = new fabric.Image('');
    this.canvas?.setBackgroundImage(image, () => this.canvas?.renderAll());
  }

  get fontSize() {
    return this.cardForm.get('fontSize') as FormControl;
  }

  private setImage(url: string) {
    fabric.Image.fromURL(url, (img) => {
      img.crossOrigin = "anonymous";
      console.log(img.crossOrigin)
      const h = img.height || 0;
      const w = img.width || 0;
      const ratio = divide (w, h)
      console.log(ratio)
      if (!h || h < 1200 || !w || w < 1800 || ratio != 1.5) {
        this.isBadImport = true;
      }
      img.scaleToHeight(400);
      img.scaleToWidth(600);
      this.canvas?.setBackgroundImage(img, () => {
        console.log('here')
        this.canvas?.renderAll();
      })
    })
  }

  private getFonts() {
    return this.http.get<WebfontList>(`https://www.googleapis.com/webfonts/v1/webfonts?key=${googleFontKey}&sort=alpha`).pipe(
      map(fonts => fonts.items)
    )
  }

  private initForm() {
    const color = new fabric.Color('0,0,0');
    return this.fb.group({
      fontSize: [16],
      fontFamily: [''],
      fontColor: [color],
      customer: ['',],
      template: [''],
      includeToFrom: [false],
      to: [''],
      from: [''],
      message: ['']
    })
  }
}
