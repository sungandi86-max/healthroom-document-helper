# PDF 공문자료 자동 가져오기 Apps Script

`apps-script/pdfImportToSheet.gs` 파일은 GitHub 저장소에 보관용으로 추가한 Apps Script 코드입니다. 실제 실행은 구글시트의 Apps Script 편집기에 파일 내용을 복사해서 사용합니다.

## 사용 위치

- 저장소 파일: `apps-script/pdfImportToSheet.gs`
- 구글시트: `쑤캥T 보건실 공문 참고자료 시트`
- 대상 탭: `공문자료목록`
- 로그 탭: `업데이트로그`

## Drive API 활성화

1. 구글시트에서 `확장 프로그램` -> `Apps Script`를 엽니다.
2. Apps Script 편집기 왼쪽의 `서비스`에서 `Drive API`를 추가합니다.
3. 실행 중 Drive API 관련 오류가 나오면 연결된 Google Cloud 프로젝트에서 `Google Drive API`를 활성화합니다.
4. 첫 실행 시 권한 승인 화면에서 스프레드시트, 문서, 드라이브 접근 권한을 승인합니다.

## 폴더 ID 수정

`pdfImportToSheet.gs` 상단의 `PDF_IMPORT_CONFIG`에서 아래 값을 필요에 맞게 수정합니다.

- `PDF_INPUT_FOLDER_ID`: 가져올 PDF가 있는 폴더
- `PDF_DONE_FOLDER_ID`: 추출 성공 PDF를 옮길 폴더
- `PDF_FAILED_FOLDER_ID`: 추출 실패 PDF를 옮길 폴더
- `TEMP_DOC_FOLDER_ID`: PDF를 Google Docs로 임시 변환할 폴더

현재 저장된 기본값은 요청 시 제공된 폴더 ID입니다.

## 메뉴 실행

1. Apps Script 편집기에 코드를 붙여넣고 저장합니다.
2. 구글시트를 새로고침합니다.
3. 상단 메뉴의 `공문자료 가져오기`를 엽니다.
4. `PDF 폴더에서 전체 가져오기`를 실행합니다.
5. 처리 결과는 `업데이트로그` 탭에서 확인합니다.

## 중복 처리

`자료명`이 같은 행이 있으면 기존 행을 업데이트합니다. 사용자가 직접 입력했을 수 있는 `붙임예시`, `메신저예시`, `체크리스트`는 덮어쓰지 않습니다.
